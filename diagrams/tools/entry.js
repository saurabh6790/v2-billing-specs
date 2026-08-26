import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";

// Dark canvas + hand-drawn strokes, matching the reference look.
const APP_STATE = {
	viewBackgroundColor: "#ffffff",
	exportBackground: true,
	exportWithDarkMode: true,
	currentItemFontFamily: 5, // Excalifont
};

window.renderDiagram = async (definition) => {
	const { elements, files } = await parseMermaidToExcalidraw(definition, {
		themeVariables: { fontSize: "16px" },
	});
	const svg = await exportToSvg({
		elements: convertToExcalidrawElements(elements),
		files: files ?? null,
		appState: APP_STATE,
		exportPadding: 32,
	});
	return svg.outerHTML;
};

window.ready = true;
