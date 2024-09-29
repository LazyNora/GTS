let points = [];
let edges = [];

const toStartBtn = document.getElementById("to-start");
const toEndBtn = document.getElementById("to-end");
const nextBtn = document.getElementById("next-button");
const prevBtn = document.getElementById("previous-button");
const playBtn = document.getElementById("play-button");
const pauseBtn = document.getElementById("pause-button");
const speedInput = document.getElementById("speed-slider");
const algorithmSelect = document.getElementById("options-select");
const gts1Start = document.getElementById("start-point");
const solveBtn = document.getElementById("solve-button");
const edgeColor = "#777";
const highlightedEdgeColor = "blue";
const visitedEdgeColor = "blue";
const highlightedPointColor = "blue";
const visitedPointColor = "blue";

let currentStep = 0;
let playing = false;
let isCalculated = false;
let speed = 1;
let intervalId = null;
let steps = [];
let algorithm = null;

// Function to generate random points
function generateRandomPoints(numPoints, width, height) {
	const points = [];
	const minDistance = 100; // Minimum distance between points
	const borderOffset = 50; // Offset from the border

	for (let i = 0; i < numPoints; i++) {
		let point;
		let validPoint = false;

		while (!validPoint) {
			point = {
				index: i,
				x: Math.random() * (width - 2 * borderOffset) + borderOffset,
				y: Math.random() * (height - 2 * borderOffset) + borderOffset,
			};

			validPoint = points.every((p) => {
				const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
				return distance >= minDistance;
			});
		}

		points.push(point);
	}

	return points;
}

function generateRandomEdges(points) {
	const edges = [];
	const numEdges = Math.max(points.length, Math.floor(Math.random() * 10) + points.length - 1);

	// Ensure at least one cycle
	for (let i = 0; i < points.length; i++) {
		const weight = Math.floor(Math.random() * 10) + 1;
		edges.push({
			point1: i,
			point2: (i + 1) % points.length,
			weight,
		});
	}

	// Add additional random edges to ensure at least 2 cycles
	while (edges.length < numEdges) {
		const index1 = Math.floor(Math.random() * points.length);
		const index2 = Math.floor(Math.random() * points.length);
		if (index1 === index2) {
			continue;
		}

		const weight = Math.floor(Math.random() * 10) + 1;
		if (
			edges.some(
				(edge) =>
					(edge.point1 === index1 && edge.point2 === index2) ||
					(edge.point1 === index2 && edge.point2 === index1)
			)
		) {
			continue;
		}
		edges.push({
			point1: index1,
			point2: index2,
			weight,
		});
	}

	return edges;
}

const graph = d3.select("#graph");
const editGraph = d3.select("#edit-graph");
const tooltip = d3
	.select("body")
	.append("div")
	.style("position", "absolute")
	.style("background-color", "#333") // Change background color
	.style("color", "white") // Change text color
	.style("border", "1px solid black")
	.style("padding", "5px 10px")
	.style("border-radius", "5px") // Add rounded corners
	.style("display", "none");

function drawPoint(point) {
	const radius = 16; // Adjust the size of the points

	const circle = graph
		.append("circle")
		.attr("id", `point-${point.index}`)
		.attr("class", "point")
		.attr("cx", point.x)
		.attr("cy", point.y)
		.attr("r", radius)
		.attr("stroke", "black")
		.attr("stroke-width", 3)
		.attr("fill", "white");

	// Add labels to the points, centered within the point
	graph
		.append("text")
		.attr("id", `point-${point.index}-label`)
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
		.on("mouseover", function (event) {
			tooltip
				.style("display", "block")
				.html(`Point ${point.index}<br>x: ${point.x.toFixed(2)}<br>y: ${point.y.toFixed(2)}`);
		})
		.on("mousemove", function (event) {
			tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 20 + "px");
		})
		.on("mouseout", function () {
			tooltip.style("display", "none");
		});

	// Add tooltip functionality
	circle
		.on("mouseover", function (event) {
			tooltip
				.style("display", "block")
				.html(`Point ${point.index}<br>x: ${point.x.toFixed(2)}<br>y: ${point.y.toFixed(2)}`);
		})
		.on("mousemove", function (event) {
			tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 20 + "px");
		})
		.on("mouseout", function () {
			tooltip.style("display", "none");
		});

	if (!isCalculated) {
		circle
			.attr("r", 0)
			.transition()
			.duration(1000) // Animation duration
			.attr("r", radius);
	}
}

function drawEdge(point1, point2, weight) {
	const lineGenerator = d3
		.line()
		.x((d) => d.x)
		.y((d) => d.y);

	const point1_pos = points.find((p) => p.index === point1);
	const point2_pos = points.find((p) => p.index === point2);

	const pathData = [
		{ x: point1_pos.x, y: point1_pos.y },
		{ x: point2_pos.x, y: point2_pos.y },
	];

	const edge = graph
		.append("path")
		.attr("id", `edge-${point1}-${point2}`)
		.attr("class", "edge")
		.attr("d", lineGenerator(pathData))
		.attr("fill", "none")
		.attr("stroke", edgeColor)
		.attr("stroke-width", 3)
		.on("click", function () {
			removeEdge(edge, weightLabel);
		});

	// Add weight label to the edge
	const midX = (point1_pos.x + point2_pos.x) / 2;
	const midY = (point1_pos.y + point2_pos.y) / 2;

	const weightLabel = graph
		.append("text")
		.attr("id", `edge-${point1}-${point2}-label`)
		.attr("class", "edge-label")
		.attr("x", midX)
		.attr("y", midY)
		.attr("dx", "-0.5em")
		.attr("dy", "-0.5em")
		.attr("text-anchor", "middle")
		.text(weight)
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.attr("font-family", "PT Sans")
		.attr("fill", "black")
		.on("mouseover", function (event) {
			tooltip.style("display", "block").html(`From ${point1} to ${point2}<br>Weight: ${weight}`);
		})
		.on("mousemove", function (event) {
			tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 20 + "px");
		})
		.on("mouseout", function () {
			tooltip.style("display", "none");
		});
}

function highlightEdge([point1, point2]) {
	let edge = graph.select(`#edge-${point1}-${point2}`);
	let pointEl1 = graph.select(`#point-${point1}`);
	let pointEl1_label = graph.select(`#point-${point1}-label`);
	let pointEl2 = graph.select(`#point-${point2}`);
	let pointEl2_label = graph.select(`#point-${point2}-label`);
	if (edge.empty()) edge = graph.select(`#edge-${point2}-${point1}`);
	let weightLabel = graph.select(`#edge-${point1}-${point2}-label`);
	if (weightLabel.empty()) weightLabel = graph.select(`#edge-${point2}-${point1}-label`);

	// Add animation draw edge from point1 to point2
	const point1_pos = points.find((p) => p.index === point1);
	const point2_pos = points.find((p) => p.index === point2);
	const midX = (point1_pos.x + point2_pos.x) / 2;
	const midY = (point1_pos.y + point2_pos.y) / 2;

	const lineGenerator = d3
		.line()
		.x((d) => d.x)
		.y((d) => d.y);

	const pathData = [
		{ x: point1_pos.x, y: point1_pos.y },
		{ x: point2_pos.x, y: point2_pos.y },
	];

	const animatedEdge = graph
		.append("path")
		.attr("id", `animated-edge-${point1}-${point2}`)
		.attr("class", "edge")
		.attr("d", lineGenerator(pathData))
		.attr("fill", "none")
		.attr("stroke", highlightedEdgeColor)
		.attr("stroke-width", 3);

	pointEl1.raise();
	pointEl1_label.raise();
	pointEl2.raise();
	pointEl2_label.raise();

	let totalLength = animatedEdge.node().getTotalLength();

	animatedEdge
		.attr("stroke-dasharray", totalLength + " " + totalLength)
		.attr("stroke-dashoffset", totalLength)
		.transition()
		.duration(1000 / speed)
		.ease(d3.easeLinear)
		.attr("stroke-dashoffset", 0)
		.attr("stroke-width", 5)
		.on("end", function () {
			animatedEdge.remove();
			edge
				.attr("stroke", highlightedEdgeColor)
				.attr("stroke-width", 3)
				.attr("class", "edge-highlighted");
		});
}

function visitEdge([point1, point2]) {
	let edge = graph.select(`#edge-${point1}-${point2}`);
	if (edge.empty()) edge = graph.select(`#edge-${point2}-${point1}`);
	if (edge.empty()) {
		const point1_pos = points.find((p) => p.index === point1);
		const point2_pos = points.find((p) => p.index === point2);
		const lineGenerator = d3
			.line()
			.x((d) => d.x)
			.y((d) => d.y);
		const pathData = [
			{ x: point1_pos.x, y: point1_pos.y },
			{ x: point2_pos.x, y: point2_pos.y },
		];
		// make a dashed line
		edge = graph
			.append("path")
			.attr("id", `nonexistent-edge-${point1}-${point2}`)
			.attr("class", "edge")
			.attr("d", lineGenerator(pathData))
			.attr("fill", "none")
			.attr("stroke", visitedEdgeColor)
			.attr("stroke-width", 3)
			.attr("stroke-dasharray", "5,5")
			.lower();
	}
	let weightLabel = graph.select(`#edge-${point1}-${point2}-label`);
	if (weightLabel.empty()) weightLabel = graph.select(`#edge-${point2}-${point1}-label`);

	edge.attr("stroke", visitedEdgeColor).attr("stroke-width", 3).attr("class", "edge-visited");
}

function highlightPoint(point) {
	let circle = graph.select(`#point-${point}`);
	let circleLabel = graph.select(`#point-${point}-label`);

	let animatedCircle = graph
		.append("circle")
		.attr("id", `animated-point-${point}`)
		.attr("class", "point")
		.attr("cx", circle.attr("cx"))
		.attr("cy", circle.attr("cy"))
		.attr("r", 0)
		.attr("stroke", highlightedPointColor)
		.attr("stroke-width", 3)
		.attr("fill", highlightedPointColor);
	circleLabel.attr("fill", "white").raise();

	animatedCircle
		.transition()
		.duration(500 / speed)
		.attr("r", 16)
		.on("end", function () {});

	let animatedCircle2 = graph
		.append("circle")
		.attr("id", `animated-point2-${point}`)
		.attr("class", "point")
		.attr("cx", circle.attr("cx"))
		.attr("cy", circle.attr("cy"))
		.attr("r", 0)
		.attr("stroke", highlightedPointColor)
		.attr("stroke-width", 3)
		.attr("fill", "white");
	animatedCircle2
		.transition()
		.delay(500 / speed)
		.duration(500 / speed)
		.attr("r", 16)
		.on("start", function () {
			circleLabel
				.raise()
				.transition()
				.duration(500 / speed)
				.attr("fill", "black");
		})
		.on("end", function () {
			animatedCircle.remove();
			animatedCircle2.remove();
			circle.attr("stroke", highlightedPointColor).attr("stroke-width", 3);
		});
}
function visitPoint(point) {
	let circle = graph.select(`#point-${point}`);
	let circleLabel = graph.select(`#point-${point}-label`);
	circle.attr("stroke", visitedPointColor).attr("stroke-width", 3).attr("class", "point-visited");
}

points = generateRandomPoints(7, 800, 800);
edges = generateRandomEdges(points);

renderGraph(points, edges);

gts1Start.addEventListener("change", function () {
	pause();
	isCalculated = false;
	steps = [];
	updateButtons();
	const start = isNaN(parseInt(gts1Start.value)) ? -1 : parseInt(gts1Start.value);
	if (start >= 0 && start < points.length) {
		gts1Start.classList.remove("error");
		gts1Start.parentElement.querySelector(".form__msg").textContent = "";
	} else {
		gts1Start.classList.add("error");
		gts1Start.parentElement.querySelector(".form__msg").textContent = "Invalid start point";
	}
});

function renderGraph(points, edges, highlights = null, msgs = null) {
	graph.selectAll("*").remove();
	edges.forEach((edge) => drawEdge(edge.point1, edge.point2, edge.weight));
	points.forEach(drawPoint);
	if (highlights) {
		highlights.highlightedEdges.forEach(highlightEdge);
		highlights.visitedEdges.forEach(visitEdge);
		highlights.highlightedPoints.forEach(highlightPoint);
		highlights.visitedPoints.forEach(visitPoint);
	}
	msgs && (document.querySelector(".log-content").innerHTML = `<p>${msgs}</p>`);
}

function updateButtons() {
	if (isCalculated) {
		playBtn.disabled = false;
	} else {
		playBtn.disabled = true;
	}

	if (playing) {
		editButton.disabled = true;
		document.querySelector(".select-selected").disabled = true;
		toStartBtn.disabled = true;
		prevBtn.disabled = true;
		toEndBtn.disabled = true;
		nextBtn.disabled = true;
		solveBtn.disabled = true;
	} else {
		editButton.disabled = false;
		document.querySelector(".select-selected").disabled = false;
		solveBtn.disabled = false;

		if (currentStep === 0) {
			prevBtn.disabled = true;
			toStartBtn.disabled = true;
		} else {
			prevBtn.disabled = false;
			toStartBtn.disabled = false;
		}

		if (currentStep === steps.length) {
			nextBtn.disabled = true;
			toEndBtn.disabled = true;
		} else {
			nextBtn.disabled = false;
			toEndBtn.disabled = false;
		}
	}
}

//GTS1 Greedy TSP
function mapToMatrix(points, edges) {
	const matrix = Array(points.length)
		.fill(null)
		.map(() => Array(points.length).fill(Infinity));

	edges.forEach((edge) => {
		matrix[edge.point1][edge.point2] = edge.weight;
		matrix[edge.point2][edge.point1] = edge.weight;
	});

	return matrix;
}

function greedyTravelingSalesman(startingPoint) {
	const tsp = mapToMatrix(points, edges);
	const visited = new Array(points.length).fill(false);
	const path = [startingPoint];
	let totalDistance = 0;
	let currentPoint = startingPoint;
	visited[currentPoint] = true;
	let visitedEdges = [];
	let highlightedEdges = [];
	let visitedPoints = [];
	let highlightedPoints = [currentPoint];
	let i = 0;

	steps.push({
		highlights: {
			highlightedPoints: [...highlightedPoints],
			visitedPoints: [...visitedPoints],
			visitedEdges: [...visitedEdges],
			highlightedEdges: [...highlightedEdges],
		},
		msgs: `Starting at point ${startingPoint}`,
	});

	highlightedPoints.pop();

	for (let k = 0; k < points.length; k++) {
		visitedPoints.push(currentPoint);
		let min = Infinity;
		let nextPoint = -1;
		for (let j = 0; j < points.length; j++) {
			if (currentPoint != j && !visited[j] && tsp[currentPoint][j] < Infinity) {
				highlightedEdges.push([currentPoint, j]);
				steps.push({
					highlights: {
						highlightedPoints: [...highlightedPoints],
						visitedPoints: [...visitedPoints],
						visitedEdges: [...visitedEdges],
						highlightedEdges: [...highlightedEdges],
					},
					msgs: `Checking edge between ${currentPoint} and ${j}`,
				});

				if (tsp[currentPoint][j] < min) {
					min = tsp[currentPoint][j];
					nextPoint = j;
				}

				highlightedEdges.pop();
			}
		}

		if (nextPoint == -1) {
			// No more reachable points from currentPoint
			steps.push({
				highlights: {
					highlightedPoints: [...highlightedPoints],
					visitedPoints: [...visitedPoints],
					visitedEdges: [...visitedEdges],
					highlightedEdges: [...highlightedEdges],
				},
				msgs: `No more reachable points from ${currentPoint}`,
			});
			break;
		}

		path.push(nextPoint);
		totalDistance += min;
		visited[nextPoint] = true;
		highlightedPoints.push(nextPoint);
		highlightedEdges.push([currentPoint, nextPoint]);
		steps.push({
			highlights: {
				highlightedPoints: [...highlightedPoints],
				visitedPoints: [...visitedPoints],
				visitedEdges: [...visitedEdges],
				highlightedEdges: [...highlightedEdges],
			},
			msgs: `Selected edge between ${currentPoint} and ${nextPoint}`,
		});

		visitedEdges.push([currentPoint, nextPoint]);
		highlightedPoints.pop();
		highlightedEdges.pop();
		currentPoint = nextPoint;
		i++;
	}

	path.push(startingPoint);
	totalDistance += tsp[currentPoint][startingPoint];
	highlightedEdges.push([currentPoint, startingPoint]);
	steps.push({
		highlights: {
			highlightedPoints: [...highlightedPoints],
			visitedPoints: [...visitedPoints],
			visitedEdges: [...visitedEdges],
			highlightedEdges: [...highlightedEdges],
		},
		msgs: `Returning to starting point ${startingPoint}`,
	});

	visitedPoints.push(currentPoint);
	visitedEdges.push([currentPoint, startingPoint]);

	steps.push({
		highlights: {
			highlightedPoints: [...highlightedPoints],
			visitedPoints: [...visitedPoints],
			visitedEdges: [...visitedEdges],
			highlightedEdges: [...highlightedEdges],
		},
		msgs: `Total distance: ${totalDistance}<br>Path: ${path.join(" -> ")}`,
	});
	return { path, totalDistance, visitedPoints, visitedEdges };
}

function greedyTravelingSalesman2(startingPoints) {
	let bestPath = [];
	let bestCost = Infinity;
	let bestVisitedPoints = [];
	let bestVisitedEdges = [];

	function runGTS1(startingPoint) {
		return greedyTravelingSalesman(startingPoint);
	}

	for (const startingPoint of startingPoints) {
		steps.push({
			highlights: {
				highlightedPoints: [startingPoint],
				visitedPoints: [],
				visitedEdges: [],
				highlightedEdges: [],
			},
			msgs: `Running GTS1 with starting point ${startingPoint}`,
		});

		// Gọi GTS1 để tìm chu trình
		const { path, totalDistance, visitedPoints, visitedEdges } = runGTS1(startingPoint);

		// Cập nhật chu trình tốt nhất
		if (totalDistance < bestCost) {
			steps.push({
				highlights: {
					highlightedPoints: [],
					visitedPoints: [...visitedPoints],
					visitedEdges: [...visitedEdges],
					highlightedEdges: [],
				},
				msgs: `Found a better path with total distance: ${totalDistance}<br>Path: ${path.join(
					" -> "
				)}<br><br>Last best path: ${bestCost}<br>Path: ${bestPath.join(" -> ")}`,
			});

			bestPath = path;
			bestCost = totalDistance;

			bestVisitedPoints = [...visitedPoints];
			bestVisitedEdges = [...visitedEdges];
		} else {
			steps.push({
				highlights: {
					highlightedPoints: [],
					visitedPoints: [],
					visitedEdges: [],
					highlightedEdges: [],
				},
				msgs: `Found path with total distance: ${totalDistance}<br>Path: ${path.join(
					" -> "
				)}<br><br>Best path: ${bestCost}<br>Path: ${bestPath.join(
					" -> "
				)}<br>Path found is not better than the best path<br>found so far`,
			});
		}
	}

	steps.push({
		highlights: {
			highlightedPoints: [],
			visitedPoints: [...bestVisitedPoints],
			visitedEdges: [...bestVisitedEdges],
			highlightedEdges: [],
		},
		msgs: `Best path found with total distance: ${bestCost}<br>Path: ${bestPath.join(" -> ")}`,
	});

	return {
		path: bestPath,
		totalDistance: bestCost,
		visitedPoints: bestVisitedPoints,
		visitedEdges: bestVisitedEdges,
	};
}

function calculateGTS1() {
	const start = isNaN(parseInt(gts1Start.value)) ? -1 : parseInt(gts1Start.value);
	if (start < 0 || start >= points.length) {
		gts1Start.classList.add("error");
		gts1Start.parentElement.querySelector(".form__msg").textContent = "Invalid start point";
		return;
	}

	gts1Start.classList.remove("error");
	gts1Start.parentElement.querySelector(".form__msg").textContent = "";

	const { path, totalDistance } = greedyTravelingSalesman(start);
	isCalculated = true;
	renderGraph(points, edges);
}

function calculateGTS2() {
	const numberOf = isNaN(parseInt(numberOfStartPoints.value))
		? -1
		: parseInt(numberOfStartPoints.value);
	if (numberOf < 0 || numberOf >= points.length) {
		numberOfStartPoints.classList.add("error");
		numberOfStartPoints.parentElement.querySelector(".form__msg").textContent =
			"Invalid number of start points";
		return;
	}

	const startPoints = Array.from(document.querySelectorAll(".start-points input"));
	const starts = startPoints.map((input) => parseInt(input.value));
	if (starts.some((start) => isNaN(start) || start < 0 || start >= points.length)) {
		startPoints.forEach((input) => {
			const start = isNaN(parseInt(input.value)) ? -1 : parseInt(input.value);
			if (start < 0 || start >= points.length) {
				input.classList.add("error");
				numberOfStartPoints.parentElement.querySelector(".form__msg").textContent =
					"Invalid start point";
			} else {
				input.classList.remove("error");
				numberOfStartPoints.parentElement.querySelector(".form__msg").textContent = "";
			}
		});
		return;
	}

	startPoints.forEach((input) => {
		input.classList.remove("error");
		numberOfStartPoints.parentElement.querySelector(".form__msg").textContent = "";
	});

	const { path, totalDistance } = greedyTravelingSalesman2(starts);
	isCalculated = true;
	renderGraph(points, edges);
}

function calculate() {
	algorithm = algorithmSelect.value;

	if (algorithm === "GTS1") {
		steps = [];
		currentStep = 0;
		calculateGTS1();
	} else {
		steps = [];
		currentStep = 0;
		calculateGTS2();
	}

	updateButtons();
}

function nextStep() {
	if (currentStep < steps.length) {
		renderGraph(points, edges, steps[currentStep].highlights, steps[currentStep].msgs);
		currentStep++;
	}
	updateButtons();
}

function prevStep() {
	if (currentStep > 0) {
		currentStep--;
		renderGraph(points, edges, steps[currentStep].highlights, steps[currentStep].msgs);
	}
	updateButtons();
}

function play() {
	if (!playing) {
		if (currentStep === steps.length) {
			currentStep = 0;
		}

		playing = true;
		speed = speedInput.value;
		playBtn.style.display = "none";
		pauseBtn.style.display = "block";
		intervalId = setInterval(() => {
			if (currentStep < steps.length) {
				nextStep();
			} else {
				clearInterval(intervalId);
				playing = false;
				playBtn.style.display = "block";
				pauseBtn.style.display = "none";
				updateButtons();
			}
		}, 1000 / speed);
	}
}

function pause() {
	clearInterval(intervalId);
	playing = false;
	playBtn.style.display = "block";
	pauseBtn.style.display = "none";
	updateButtons();
}

toStartBtn.addEventListener("click", () => {
	currentStep = 0;
	renderGraph(points, edges, steps[currentStep].highlights, steps[currentStep].msgs);
	updateButtons();
});

toEndBtn.addEventListener("click", () => {
	currentStep = steps.length - 1;
	renderGraph(points, edges, steps[currentStep].highlights, steps[currentStep].msgs);
	updateButtons();
});

nextBtn.addEventListener("click", nextStep);
prevBtn.addEventListener("click", prevStep);
playBtn.addEventListener("click", play);
pauseBtn.addEventListener("click", pause);

speedInput.addEventListener("input", () => {
	speed = speedInput.value;
	if (playing) {
		clearInterval(intervalId);
		intervalId = setInterval(() => {
			if (currentStep < steps.length) {
				nextStep();
			} else {
				clearInterval(intervalId);
				playing = false;
				playBtn.style.display = "block";
				pauseBtn.style.display = "none";
				updateButtons();
			}
		}, 1000 / speed);
	}
});

algorithmSelect.addEventListener("change", () => {
	const gts1 = document.querySelector(".gts1");
	const gts2 = document.querySelector(".gts2");
	algorithm = algorithmSelect.value;
	if (algorithm === "GTS1") {
		gts1.style.display = "block";
		gts2.style.display = "none";
	} else {
		gts1.style.display = "none";
		gts2.style.display = "block";
		document.getElementById("number-of-start-points").dispatchEvent(new Event("input"));
	}
	currentStep = 0;
});

solveBtn.addEventListener("click", calculate);

updateButtons();

const numberOfStartPoints = document.getElementById("number-of-start-points");
const startPoints = document.querySelector(".start-points");
numberOfStartPoints.addEventListener("input", () => {
	const n = isNaN(numberOfStartPoints.value) ? 0 : parseInt(numberOfStartPoints.value);
	startPoints.innerHTML = "";

	if (n < 0 || n >= points.length) {
		numberOfStartPoints.classList.add("error");
		numberOfStartPoints.parentElement.querySelector(".form__msg").textContent =
			"Invalid number of start points";
		return;
	}

	numberOfStartPoints.classList.remove("error");
	numberOfStartPoints.parentElement.querySelector(".form__msg").textContent = "";

	for (let i = 0; i < n; i++) {
		const div = document.createElement("div");
		div.classList.add("form-field");
		div.innerHTML = `
										<input
											type="number"
											class="form__input"
											placeholder=""
											name="start-point-${i}"
											id="start-point-${i}"
											required />
										<label for="start-point-${i}" class="form__label">Point ${i + 1}</label>
									`;

		div.addEventListener("input", function () {
			pause();
			isCalculated = false;
			steps = [];
			updateButtons();
			const start = isNaN(parseInt(div.querySelector("input").value))
				? -1
				: parseInt(div.querySelector("input").value);
			if (start >= 0 && start < points.length) {
				div.querySelector("input").classList.remove("error");
				numberOfStartPoints.parentElement.querySelector(".form__msg").textContent = "";
			} else {
				div.querySelector("input").classList.add("error");
				numberOfStartPoints.parentElement.querySelector(".form__msg").textContent =
					"Invalid start point";
			}
		});
		startPoints.appendChild(div);
	}
});
