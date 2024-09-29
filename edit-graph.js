let edit_points = [];
let selectedPoints = [];
let edit_edges = [];

const editButton = document.getElementById("edit");
const saveButton = document.getElementById("save");
const clearButton = document.getElementById("clear");
const cancelButton = document.getElementById("cancel");
const closeButton = document.getElementById("close");
const addPointButton = document.getElementById("add-point");
const deletePointButton = document.getElementById("delete-point");
const modal = document.getElementById("modal");

editButton.addEventListener("click", function () {
	modal.style.display = "block";
	showCurrentGraph();
});

closeButton.addEventListener("click", function () {
	modal.style.display = "none";
});

cancelButton.addEventListener("click", function () {
	modal.style.display = "none";
});

clearButton.addEventListener("click", function () {
	editGraph.selectAll("*").remove();
	edit_points = [];
	edit_edges = [];
});

saveButton.addEventListener("click", function () {
	modal.style.display = "none";
	graph.selectAll("*").remove();
	points = JSON.parse(JSON.stringify(edit_points));
	edges = JSON.parse(JSON.stringify(edit_edges));
	edit_points = [];
	edit_edges = [];
	selectedPoints = [];
	renderGraph(points, edges);
});

addPointButton.addEventListener("click", function () {
	addPointButton.disabled = true;
	editGraph.on("click", function (event) {
		const [x, y] = d3.pointer(event);
		const indices = edit_points.map((p) => p.index);
		let newIndex = 0;
		while (indices.includes(newIndex)) {
			newIndex++;
		}
		const newPoint = { index: newIndex, x, y };
		edit_points.push(newPoint);
		drawEditablePoint(newPoint);
		editGraph.on("click", null); // Remove click listener after adding point
		addPointButton.disabled = false;
	});
});

deletePointButton.addEventListener("click", function () {
	if (selectedPoints.length === 1) {
		const index = selectedPoints[0];
		edit_points = edit_points.filter((p) => p.index !== index);
		edit_edges = edit_edges.filter((e) => e.point1 !== index && e.point2 !== index);
		updateEditGraph();
		selectedPoints = [];
		deletePointButton.disabled = true;
	}
});

function showCurrentGraph() {
	editGraph.selectAll("*").remove();
	edit_edges = edges.map((edge) => ({
		point1: edge.point1,
		point2: edge.point2,
		weight: edge.weight,
	}));
	edit_points = points.map((point) => ({ index: point.index, x: point.x, y: point.y }));
	edit_edges.forEach((edge) => drawEditableEdge(edge.point1, edge.point2, edge.weight));
	edit_points.forEach((point) => drawEditablePoint(point));
	deletePointButton.disabled = true;
}

function drawEditablePoint(point) {
	const radius = 16; // Adjust the size of the points

	const circle = editGraph
		.append("circle")
		.attr("id", `edit-point-${point.index}`)
		.attr("class", "point")
		.attr("cx", point.x)
		.attr("cy", point.y)
		.attr("r", radius)
		.attr("stroke", "black")
		.attr("stroke-width", 3)
		.attr("fill", "white")
		.call(
			d3.drag().on("drag", function (event) {
				d3.select(this).attr("cx", event.x).attr("cy", event.y);
				point.x = event.x;
				point.y = event.y;
				updateEditGraph();
			})
		);

	// Add labels to the points, centered within the point
	editGraph
		.append("text")
		.attr("id", `edit-point-${point.index}-label`)
		.attr("class", "point-label")
		.attr("x", point.x)
		.attr("y", point.y)
		.attr("dy", ".35em") // Vertical alignment
		.attr("text-anchor", "middle") // Horizontal alignment
		.text(point.index)
		.attr("font-size", "14px")
		.attr("font-weight", "bold")
		.attr("font-family", "PT Sans")
		.attr("fill", "black")
		.on("click", function () {
			selectEditablePoint(circle, point.index);
		});

	// Add tooltip functionality
	circle.on("click", function () {
		selectEditablePoint(circle, point.index);
	});
}

function selectEditablePoint(circle, index) {
	if (circle.classed("selected")) {
		circle.classed("selected", false);
		selectedPoints = selectedPoints.filter((p) => p !== index);
	} else {
		circle.classed("selected", true);
		selectedPoints.push(index);
	}

	if (selectedPoints.length === 2) {
		const [point1, point2] = selectedPoints;
		let weight = prompt("Enter the weight of the edge", "1");
		if (weight === null || weight === "" || isNaN(weight)) {
			selectedPoints.forEach((p) => d3.select(`#edit-point-${p}`).classed("selected", false));
			selectedPoints = [];
			return;
		}

		weight = parseInt(weight);

		if (edit_edges.some((e) => e.point1 === point1 && e.point2 === point2)) {
			const edge = edit_edges.find((e) => e.point1 === point1 && e.point2 === point2);
			edge.weight = weight;
		} else if (edit_edges.some((e) => e.point1 === point2 && e.point2 === point1)) {
			const edge = edit_edges.find((e) => e.point1 === point2 && e.point2 === point1);
			edge.weight = weight;
		} else {
			edit_edges.push({ point1, point2, weight });
		}

		selectedPoints.forEach((p) => d3.select(`#edit-point-${p}`).classed("selected", false));
		selectedPoints = [];
		updateEditGraph();
	}

	if (selectedPoints.length > 0) deletePointButton.disabled = false;
	else deletePointButton.disabled = true;
}

function drawEditableEdge(point1, point2, weight) {
	const lineGenerator = d3
		.line()
		.x((d) => d.x)
		.y((d) => d.y);

	const point1_pos = edit_points.find((p) => p.index === point1);
	const point2_pos = edit_points.find((p) => p.index === point2);

	const pathData = [
		{ x: point1_pos.x, y: point1_pos.y },
		{ x: point2_pos.x, y: point2_pos.y },
	];

	const edge = editGraph
		.append("path")
		.attr("id", `edit-edge-${point1}-${point2}`)
		.attr("class", "edge")
		.attr("d", lineGenerator(pathData))
		.attr("fill", "none")
		.attr("stroke", "#777")
		.attr("stroke-width", 3)
		.on("click", function () {
			removeEditableEdge(edge, weightLabel, point1, point2);
		});

	// Add weight label to the edge
	const midX = (point1_pos.x + point2_pos.x) / 2;
	const midY = (point1_pos.y + point2_pos.y) / 2;

	const weightLabel = editGraph
		.append("text")
		.attr("id", `edit-edge-${point1}-${point2}-label`)
		.attr("class", "edge-label")
		.attr("x", midX)
		.attr("y", midY)
		.attr("dx", "-0.5em")
		.attr("dy", "-0.5em")
		.attr("text-anchor", "middle")
		.text(weight)
		.attr("font-size", "14px")
		.attr("font-weight", "bold")
		.attr("font-family", "PT Sans")
		.attr("fill", "black")
		.on("click", function () {
			removeEditableEdge(edge, weightLabel, point1, point2);
		});
}

function removeEditableEdge(edge, weightLabel, point1, point2) {
	edge.remove();
	weightLabel.remove();
	edit_edges = edit_edges.filter((e) => e.point1 !== point1 || e.point2 !== point2);
}

function updateEditGraph() {
	editGraph.selectAll("*").remove();
	edit_edges.forEach((edge) => drawEditableEdge(edge.point1, edge.point2, edge.weight));
	edit_points.forEach((point) => drawEditablePoint(point));
	selectedPoints.forEach((point) => d3.select(`#edit-point-${point}`).classed("selected", true));
}
