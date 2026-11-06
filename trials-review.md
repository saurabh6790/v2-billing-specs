# Trials and billing: what breaks and how we fix it

This week I wanted to check one flow end to end. A user signs up for Raven, gets 7 free days, and adds a card to keep the site. Prathamesh had just merged the trial upgrade work (#495) into Central's `develop`, so I pulled the latest code and read the trial path line by line.

Most of what we want already works. But a few cases will put wrong charges on a customer's bill, and one thing we promise users is not happening in production. This post covers how trials work today, what breaks, and the order in which I want to fix it.

TLDR;

- **A free trial is a server that runs without a billing record (a Subscription) for a set number of days. Our billing engine never sees it, so invoices, credits and dunning are not affected by trials.**
- **The problems are at the edges, ie when the trial starts and when it turns into a paid server. Three of them can bill a customer for something they did not ask for, or give free servers to a team that owes us money.**
- **Trial servers do not sleep in production, even though every email says they do. That one is a small fix and should ship first.**

## Current State

A user signs up from a product page, for example `/dashboard/signup?product=raven`. Central creates a site for them. If their team has no active card, the site is a free trial.

A trial has no Subscription, so it creates no invoice. A daily job moves it along. It runs for the product's Trial Days, then the server stops. After Trial Deletion Days, the server is deleted. Each product can set its own days. If it leaves them at 0, Central Settings applies, which is 14 and 14 on a new install.

When the team adds a card and it becomes active, two things happen. First, the team gets a welcome credit, but only if one of its trials is still running. The credit is 10 USD or 1000 INR, it expires in 60 days, and each owner gets it only once. Second, the trials become paid. Each one gets a Subscription and the normal billing engine takes over from that day. The days spent in the trial are never billed.

A user who buys a server directly from the dashboard gets no trial. They need a card or enough credit first, and their first card also gives them the welcome credit.

## What breaks

I found eleven issues. Each one is written up as an issue in `issues/112` to `issues/122` with the code references. Here they are in short.

| # | Issue | Who it hurts |
|---|---|---|
| 112 | Trial servers never sleep in production | Us, as infra cost |
| 113 | A card restarts and bills trials the user had already left | Customer |
| 114 | A team with a lapsed card, even one in dunning, gets free trials again | Us |
| 115 | "Is this a trial" is worked out again at each step, so a card change in between gives a different answer | Both |
| 116 | Converting trials skips the spend limit | Us |
| 117 | A paying team cannot try a second product for free | Customer |
| 118 | The 3-trial limit is per team, so a new team gives 3 more | Us |
| 119 | Teams that pay without a card cannot convert a trial | Customer |
| 120 | Card setup says "no charge", but Stripe charges $0.50 and refunds it, and Razorpay takes ₹1 | Customer |
| 121 | Welcome credit cannot be $5 for one product and $10 for another | Product |
| 122 | Metered usage (AI tokens, mail) inside a trial site has no trial rule | Later |

The sleep issue (112) is a plain bug. The code that sets sleep on a new server only does it for staging teams. That flag is off in production, so every production trial server runs all the time, while the email tells the user "your site sleeps when nobody uses it".

The one I worry about most is 113. Say a user tries Raven and leaves it. The trial ends and the server stops. Two weeks later they try Helpdesk and add a card. Today Central converts every trial on the team, so it also starts Raven's server and bills it. The user never asked for Raven back. This will come back to us as a refund or a dispute.

114 is the other side of the same rule. Central treats a team as a trial team if it has no active card right now. It does not look at whether the team has paid us before. So a team whose card failed, and which is in dunning with unpaid invoices, can still open three free servers.

115 is rarer but harder to explain. Central asks "does this team have a card?" again at four points while a site is being created. If the card changes in those few minutes, a paid server can turn into a free trial, or the reverse.

## The plan

I have split the fixes into three steps. Each step is safe to ship on its own.

Step 1 is to stop the wrong charges and the leaks: 112, 115, 113 and 114, in that order. 112 is a few lines and ships first. 115 stores the trial decision once on the creation request, so later steps read it instead of asking again. 113 and 114 then change who converts and who is eligible.

Step 2 tightens the limits: 116 (spend limit at conversion) and 118 (trials per owner). Neither changes what a normal user sees.

Step 3 needs product decisions before we build: 117 (trials for paying teams), 119 (teams without a card), 120 (what card setup charges), 121 (credit per product) and 122 (metered usage). These change what we promise the user, so I want us to agree on them first.

To match the flow we planned (7 days free, deleted on day 14), we also need to set Trial Days to 7 and Trial Deletion Days to 7, on the Product or in Central Settings. That is a setting, not code.

## Any Risk?

Steps 1 and 2 only touch the trial path. The billing engine does not change, because a trial has no Subscription until it converts.

113 changes behaviour that users may already rely on. Today adding a card brings back an ended trial on its own. After the fix, the user has to click Start on that server. The conversion email must say this clearly, or users will think their site is lost.

114 can block a real customer who comes back after their card expired. They will see "add a payment method" on the signup page instead of a free trial. I think that is the right call for a team that has paid before, but it is worth a check with the product team.

## What's next?

- Prathamesh wrote the trial code, so I would like him to review 112 to 116 before we pick them up.
- For step 3, I need answers on four questions:
  1. Should a paying team get a free trial of a new product (117)?
  2. What counts as "can pay" for a team without a card (119)?
  3. Do we keep the $0.50 card check (120)?
  4. Is metered usage free during a trial (122)?
- Before we touch 120, someone needs to check in the Razorpay dashboard whether the ₹1 registration payments are being refunded.
