var matType = 'Y';
var matName = {
    Y: 'Yetter',
    K: 'Kringle',
    Pe: 'Peeso',
    Pi: 'Piton',
    R: 'Rattan',
    S: 'Struktor',
    Sa: 'Sardina',
    S2: 'Sardina2'
};
var matNameArray = Object.keys(matName).map( d => ({key: d, value: matName[d]}) );
var presets = definePresets(); 
var presetArray = Object.keys(matName)
    .map(d => ({key: d, value: Object.keys(presets[d])
        .filter(d => (d != 'mat' && d != 'dev')).sort(d3.ascending)}));
var color = d3.scaleOrdinal(d3.schemeCategory10);
var matCtrl = { width: 800, height: 800, translate: 'translate(0,50)'};
var sliderCtrl = { width: 800, height: 500, translate: 'translate(0,950)'};
var optionCtrl = { width: 800, height: 330, translate: 'translate(800,600)'};
var width;
var height;
if ( window.innerWidth < window.innerHeight ) {
    width = Math.max(matCtrl.width, sliderCtrl.width);
    height = matCtrl.height + sliderCtrl.height + optionCtrl.height + 300;
    sliderCtrl.translate = 'translate(0,950)';
    optionCtrl.translate = 'translate(0,1500)';
} else {
    width = matCtrl.width + sliderCtrl.width;
    height = Math.max(matCtrl.height + 100, sliderCtrl.height);
    sliderCtrl.translate = 'translate(800,70)';
}
var svg = d3.select('body').append('svg')
    .attr('id', 'mat')
    .attr('viewBox','0 0 ' + width + ' ' + height)
    .append('g')
    .attr('transform',matCtrl.translate)
    .append('svg')
    .attr('width',matCtrl.width)
    .attr('height',matCtrl.height)
    .attr('viewBox','-' + matCtrl.width / 2 + ' -' + matCtrl.height / 2
        + ' ' +  matCtrl.width + ' ' + matCtrl.height
    );
svgFullScreen();
var path = svg.append("path")
    .attr('id','matpath')
    .attr('fill', 'none')
    .attr('stroke', '#333333')
    .attr('stroke-width','5');
var segments_g = svg.append("g");
var highlights = svg.append("g");
var mat = svg.append("g");
var circle_g = svg.append("g");
var slider_g = d3.select('svg#mat').append('g').attr('id', 'sliders').attr('transform',sliderCtrl.translate);
var option_g = d3.select('svg#mat').append('g').attr('id', 'options').attr('transform',optionCtrl.translate);
var title_g = d3.select('svg#mat').append('text').attr('id', 'title')
    .attr('text-anchor', 'middle')
    .attr('transform','translate(' + matCtrl.width / 2 + ',42)');
option_g.append('text').attr('id','angle')
    .attr('text-anchor', 'end')
    .attr('transform','translate(50,36)').text('');
option_g.append('text')
    .attr('text-anchor', 'start')
    .attr('transform','translate(54,36)').text('Degrees per Step');
option_g.append('g').attr('id','mattype').selectAll('text').data(matNameArray).join('text')
    .text(d => d.value)
    .attr('y', (d,i) => 55 + 18 * i)
    .on('click', (x,d) => {matType = d.key; updateMat();});
var presets_g = option_g.append('g').attr('id','presets').selectAll('g').data(presetArray).join('g')
    .attr('transform', (d,i) => 'translate(80,' + (55 + i * 18) + ')') ;
presets_g.selectAll('text').data(d => d.value).join('text')
    .text(d => '( ' + d + ' )')
    .attr('text-anchor', 'middle')
    .attr('x', (d,i) => 0 + 40 * i)
    .on('click', (x,d) => 
        loadPreset(d3.select(x.currentTarget.parentNode).data()[0]['key'], d)
    );

var buttonData = [
    {label: "UnderOver",  x: 11,  y: optionCtrl.height - 50 },
    {label: "SingleLoop", x: 172, y: optionCtrl.height - 50 },
    {label: "Circles",    x: 336, y: optionCtrl.height - 50 },
    {label: "CtrlPts",    x: 445, y: optionCtrl.height - 50 },
    {label: "Fit",        x: 641, y: optionCtrl.height - 50 },
    {label: "Int",        x: 700, y: optionCtrl.height - 108 },
    {label: "Dev",        x: 700, y: optionCtrl.height - 50 },
];
var control_flags = {};
buttonData.map(d => control_flags[d.label] = 0);
//buttonData = [];

var button = d3.button()
    .on('press', (x,d) => { control_flags[d.label] = 1; updateMat(); })
    .on('release', (x,d) => { control_flags[d.label] = 0; updateMat(); })

// Add buttons
var buttons = option_g.selectAll('.button')
    .data(buttonData)
    .join('g')
    .attr('class', 'button')
    .call(button);

window.addEventListener("resize", svgFullScreen);

function svgFullScreen() {
    var htmlwidth = d3.select('html').node().clientWidth;
    var htmlheight = d3.select('html').node().clientHeight;
    //console.log(htmlwidth + ',' + htmlheight);
    d3.select('#mat').attr('width', htmlwidth).attr('height', htmlheight)
}

function svgMatZoom() {
    var vbox = '-400 -400 800 800';
    if ( control_flags['Fit'] ) {
        var bbox = d3.select('#mat svg').node().getBBox();
        var off = Math.floor(( Math.min(bbox.x - 9, bbox.y - 9, -400)  ) / 10) * 10;
        var size = -2 * off;
        vbox =  off + ' ' + off + ' ' + size + ' ' + size;
    }
    d3.select('#mat svg').attr('viewBox', vbox);
}

function btwn(a, b1, b2) {
    if ((a >= b1) && (a <= b2)) { return true; }
    if ((a >= b2) && (a <= b1)) { return true; }
    return false;
}

function line_line_intersect(line1, line2) {
    var x1 = line1.x1, x2 = line1.x2, x3 = line2.x1, x4 = line2.x2;
    var y1 = line1.y1, y2 = line1.y2, y3 = line2.y1, y4 = line2.y2;
    var pt_denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    var pt_x_num = (x1*y2 - y1*x2) * (x3 - x4) - (x1 - x2) * (x3*y4 - y3*x4);
    var pt_y_num = (x1*y2 - y1*x2) * (y3 - y4) - (y1 - y2) * (x3*y4 - y3*x4);
    if (pt_denom == 0) { return "parallel"; }
    else { 
        var pt = {x: pt_x_num / pt_denom, y: pt_y_num / pt_denom}; 
        var per1 = ( pt.x - x1) / ( x2 - x1 );
        var per2 = ( pt.x - x3) / ( x4 - x3 );
        pt.i1 = Math.floor(( line1.i2 - line1.i1 ) * per1 + line1.i1);
        pt.i2 = Math.floor(( line2.i2 - line2.i1 ) * per2 + line2.i1);
        if (btwn(pt.x, x1, x2) && btwn(pt.y, y1, y2) && btwn(pt.x, x3, x4) && btwn(pt.y, y3, y4)) { return pt; }
        else { return "not in range"; }
    }
}

function path_intersections(path) {
    var data = d3.select('#sliders').selectAll('g').data();
    var knots = data.filter(d => d.name == "Knots")[0]['value'];
    var length = path.node().getTotalLength();
    var step = Math.floor(length / knots / 50);
    var nodes = []
    for (var i=0; i < length; i += step) {
        nodes.push({ p: path.node().getPointAtLength(i), i});
    }
    nodes.push({ p: path.node().getPointAtLength(length), i: length});
    var pts = []
    var segments = [];
    for (var i=0; i < nodes.length - 3; i++) {
        var pos1 = nodes[i];
        var pos2 = nodes[i+1];
        //segments.push({pos1:pos1.p, pos2:pos2.p});
        var line1 = {x1: pos1.p.x, x2: pos2.p.x, y1: pos1.p.y, y2: pos2.p.y, i1: pos1.i, i2: pos2.i};
        for (var j=i+2; j < nodes.length - 1; j++) {
            var pos3 = nodes[j];
            var pos4 = nodes[j+1];
            var line2 = {x1: pos3.p.x, x2: pos4.p.x, y1: pos3.p.y, y2: pos4.p.y, i1: pos3.i, i2: pos4.i};
            var pt = line_line_intersect(line1, line2);
            if (typeof(pt) != "string") {
                pts.push(pt);
            }
        }}
    segments_g.selectAll("line").data(segments).join("line")
        .attr("class", "segment")
        .attr("x1", d => d.pos1.x)
        .attr("y1", d => d.pos1.y)
        .attr("x2", d => d.pos2.x)
        .attr("y2", d => d.pos2.y)
        .attr("stroke", (d,i) => color(i));
    return pts;
}

function distance_to_closest_X(point, pathX) {
    return d3.min(pathX.map( d => ((point.x - d.x) ** 2 + (point.y - d.y) ** 2) ));
    return Math.sqrt(d3.min(pathX.map( d => ((point.x - d.x) ** 2 + (point.y - d.y) ** 2) )));
}

function create_dasharray(pathX) {
    var dasharray = "";
    var arrayX = pathX.flatMap( d => [d.i1, d.i2] ).sort((a,b) => ( a - b ));
    var min = 100000;
    for ( var i =0; i < arrayX.length - 1; i++ ) {
        min = Math.min(min, arrayX[i+1] - arrayX[i]); 
    }
    //console.log(min);
    var curPos = 0;
    for ( var i = 1; i < arrayX.length; i+=2) {
        var seg_length = arrayX[i] - curPos - 10;
        if ( seg_length < 0 ) { seg_length = 0; }
        dasharray += seg_length + ",20,";
        curPos = arrayX[i] + 10;
    }
    dasharray += '1000000'; // Fix this with a sane value 20210219 SYH
    return dasharray;
}

function draw_intersections(pts) {
    highlights.selectAll("circle").remove();
    pts.forEach(function(pt){
        highlights.append("circle")
            .attr("cx", pt.x)
            .attr("cy", pt.y)
            .attr("r", 8)
            .attr("fill", "none")
            .attr("stroke", "steelblue");

        highlights.append("circle")
            .attr("cx", pt.x)
            .attr("cy", pt.y)
            .attr("r", 2)
            .attr("fill", "steelblue")
            .attr("stroke", "none");
    });
}

function draw_segments(path, qty) {
    var length = path.node().getTotalLength();
    var segments = [];
    if (qty > 0){ 
        for (var i=0; i<qty; i++) {
            var pos1 = path.node().getPointAtLength(length * i / qty);
            var pos2 = path.node().getPointAtLength(length * (i+1) / qty);
            segments.push({pos1:pos1, pos2:pos2});
        }
    }
    segments_g.selectAll("line").data(segments).join("line")
        .attr("class", "segment")
        .attr("x1", d => d.pos1.x)
        .attr("y1", d => d.pos1.y)
        .attr("x2", d => d.pos2.x)
        .attr("y2", d => d.pos2.y)
        .attr("stroke", (d,i) => color(i));
}

//d3.select("#slider").on("change", function() { d3.select("#n_segments_text").text(this.value); updateMat(); });

//d3.select("#intersect").on("change", function() {
d3.selectAll("input").on("input", function() { updateMat(); }).on("change", function() { updateMat(); });

//d3.select("#segment").on("change", function() { updateMat(); });

//draw_intersections( pathX );


function updateMat() {
    showCircles();
    var knotpoints = createKnotPoints();
    d3.select('#title').text(matName[matType] + ' Mat');

    if (control_flags['CtrlPts']) { 
        showControlPoints(mat, knotpoints); 
    } else {
        showControlPoints(mat, []);
    }
    var matpath = d3.select('#matpath');
    matpath.attr('d', knotpoints.map( d => createPointString(d) ).toString() );
    var pathX = path_intersections(matpath);
    if ( control_flags['Int'] ) { 
        draw_intersections( pathX );
    } else { highlights.selectAll("circle").remove(); }
    var data = d3.select('#sliders').selectAll('g').data();
    var show = data.filter(d => d.name == "Segments")[0];
    if ( show['value'] == show['max']) {
        matpath.attr("stroke-dasharray", "");
        if ( control_flags['UnderOver'] ) { 
            matpath.attr("stroke-dasharray", create_dasharray(pathX));
        }
    }
    //if (d3.select("#intersect").property("checked")){ draw_intersections(pathX); } else { highlights.selectAll("circle").remove(); }
    //if (d3.select("#segment").property("checked")){ draw_segments( matpath, 300 ); //d3.select("#slider").node().value); } else { segments_g.selectAll("line").remove(); }
    svgMatZoom();
}

function showControlPoints(mat, knotpoints) {
    var matt_cp = mat.selectAll('g').data([knotpoints]).join('g');
    matt_cp.selectAll('circle').data(d => d.flatMap(e => [e.p, e.cp1, e.cp2])).join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 7).attr('fill', 'orange');
    matt_cp.selectAll('g').data(d => [d,d,d]).join('g').attr('class', (d,i) => "line" + i );
    matt_cp.selectAll('g.line0').selectAll('line').data(d => d).join('line')
        .attr('x1', d => d.p.x)
        .attr('y1', d => d.p.y)
        .attr('x2', '0')
        .attr('y2', '0')
        .attr('stroke', '#181818');
    matt_cp.selectAll('g.line1').selectAll('line').data(d => d).join('line')
        .attr('x1', d => d.p.x)
        .attr('y1', d => d.p.y)
        .attr('x2', d => d.cp1.x)
        .attr('y2', d => d.cp1.y)
        .attr('stroke', '#181818');
    matt_cp.selectAll('g.line2').selectAll('line').data(d => d).join('line')
        .attr('x1', d => d.p.x)
        .attr('y1', d => d.p.y)
        .attr('x2', d => d.cp2.x)
        .attr('y2', d => d.cp2.y)
        .attr('stroke', '#181818');
}

function showCircles() {
    var data = d3.select('#sliders').selectAll('g').data();
    var largeCircle = data.filter(d => d.name == "LargeCircle")[0]['value'];
    var smallCircle = data.filter(d => d.name == "SmallCircle")[0]['value'];
    var circles = []
    var lines = [];
    if (control_flags['Circles']) { 
        circles = [{ x:0, y:0, r:smallCircle}, {x:0, y:0, r:largeCircle}];
        lines = [[-390,0,390,0], [0,-390, 0, 390]];
    }
    circle_g.selectAll("circle").data(circles).join("circle")
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => Math.abs(d.r))
        .attr('fill', 'none')
        .attr('stroke', d => (d.r < 0) ? 'red' : '#181818');//.call(drag);
    circle_g.selectAll("line").data(lines).join("line")
        .attr('x1', d => d[0])
        .attr('y1', d => d[1])
        .attr('x2', d => d[2])
        .attr('y2', d => d[3])
        .attr('stroke', '#181818');
}

function getSliderDefs() {
    return [
        { name: "Knots" },
        { name: "LargeCircle" },
        { name: "SmallCircle" },
        { name: "StartCP" },
        { name: "MiddleCP" },
        { name: "Segments" }
    ];
}
function getSliderDevDefs() {
    return [
        { min: '3', max: '19' }, // Knots
        { min: '-500', max: '500' }, // Large Circle
        { min: '-500', max: '500' }, // Small Circle
        { min: '-300', max: '300' }, // Start Control Points
        { min: '-300', max: '300' }, // Middle Control Points
        { min: '2', max: '27' } // Segments to show
    ];
}

function createSliders(g) {
    var sliders = getSliderDefs();
    var sl_g = g.selectAll('g').data(sliders).join('g')
        .attr('transform', (d, i) => 'translate(' + ( i * sliderCtrl.width / sliders.length ) + ', 0)')
        .attr('id', d => 'slider_' + d.name )
        .call(createSlider);
    //sl_g.select('rect').attr('width', d => sliderCtrl.width / sliderCtrl.length - 4);
    sl_g.select('rect').attr('y', d => d3.scaleLinear()
        .range([sliderCtrl.height - 10,10]).clamp(true).domain([d.min, d.max])(d.value));
    sl_g.select('text#name').text(d => d.name);
    sl_g.select('text#value').text(d => d.value);
}

function updateSliders(g) {
    g.select('rect').attr('y', d => d.y);
    g.select('text#value').text(d => d.value);
}

function createSlider(g) {
    g.append('line')
        .attr('x1', 50).attr('y1', 10)
        .attr('x2', 50).attr('y2', sliderCtrl.height + 50);
    g.append('rect')
        .attr('x', 1).attr('y', 5)
        .attr('width', 98).attr('height', 60)
        .call(drag);
    g.append('text')
        .attr('id', 'name')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(50, 0)')
        .text('d.name');
    g.append('text')
        .attr('id', 'value')
        .attr('text-anchor', 'middle')
        .classed('slider_value', true)
        .attr('transform', 'translate(50, -20)')
        .text('d.value');
}

var ppk;
function getControls(pointsPerKnot) {
    ppk = pointsPerKnot;
    var data = d3.select('#sliders').selectAll('g').data();
    var knots = data.filter(d => d.name == "Knots")[0]['value'];
    var angle = Math.floor(36000 / knots) / 100;
    d3.selectAll("#angle").html(angle);
    var showmax = 1 + pointsPerKnot * knots;
    var show = data.filter(d => d.name == "Segments")[0]['value'];
    var single = control_flags['SingleLoop'];
    var largeCircle = data.filter(d => d.name == "LargeCircle")[0]['value'];
    var smallCircle = data.filter(d => d.name == "SmallCircle")[0]['value'];
    var showCircle = control_flags['Circles'];
    var startcp = data.filter(d => d.name == "StartCP")[0]['value'] * 10;
    var midcp = data.filter(d => d.name == "MiddleCP")[0]['value'] * 10;
    if ( single ) { show = pointsPerKnot + 1 };
    if ( 0 ) { show = showmax };
    return { knots, angle, show, single, largeCircle, smallCircle, showCircle, startcp, midcp };
}

var underOver;
function dragstarted(event, d) {
    d3.select(this).raise().classed("on", 1);
    underOver = control_flags['UnderOver'];
    if (d3.select(this.parentNode).attr('id') != 'slider_Segments') {
        control_flags['UnderOver'] = 0;
    }
}

function dragged(event, d) {
    d.value = d3.scaleLinear().domain([sliderCtrl.height - 10,10]).clamp(true).rangeRound([d.min, d.max])(event.y);
    d.y = d3.scaleLinear().domain([sliderCtrl.height - 10,10]).clamp(true).rangeRound([d.min, d.max]).invert(d.value);
    //console.log(event.y + ' ' + d.value + ' ' + d.y);
    d3.select(this).attr('y', d => d.y);
    d3.select(this.parentNode).select('text#name').text(d.name);
    d3.select(this.parentNode).select('text#value').text(d.value);
    if (d3.select(this.parentNode).attr('id') == 'slider_Knots') {
        var fullSlider = 1 + ppk * d.value;
        var g = d3.select('#sliders').selectAll('g');
        var currentData = g.data();
        currentData[5]['max'] = currentData[5]['value'] = fullSlider;
        g.data(currentData).join('g');
        updateSliders(g);
    }
    updateMat();
}

function dragended(event, d) {
    d3.select(this).classed("on", 0);
    control_flags['UnderOver'] = underOver;
    updateMat();
}

drag = d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

createSliders(slider_g);

function createKnotPoints_old() {
    if (d3.select("#kringle").property("checked")) { return createKringleKnot(); }
    if (d3.select("#yetter").property("checked")) { return createYetterKnot(); }
    if (d3.select("#piton").property("checked")) { return createPitonKnot(); }
    if (d3.select("#peeso").property("checked")) { return createPeesoKnot(); }
    if (d3.select("#rattan").property("checked")) { return createRattanKnot(); }
    return createYetterKnot();
}
function createKnotPoints() {
    if (matType == 'K') { return createKringleKnot(); }
    if (matType == 'Y') { return createYetterKnot(); }
    if (matType == 'Pi') { return createPitonKnot(); }
    if (matType == 'Pe') { return createPeesoKnot(); }
    if (matType == 'R') { return createRattanKnot(); }
    if (matType == 'S') { return createStruktorKnot(); }
    if (matType == 'Sa') { return createSardinaKnot(); }
    if (matType == 'S2') { return createSardina2Knot(); }
    return createYetterKnot();
}

function createStruktorKnot() {
    var c = getControls(8);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(300, -x * c.angle - 45, c.startcp / 3, 50));
        nodepoints.push(createPoint(200, -x * c.angle - 90, 100, 100));
        nodepoints.push(createPoint(300, -x * c.angle - 135, 50, c.startcp / 2));
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle, c.midcp, c.midcp));
        nodepoints.push(createPoint(300, -x * c.angle + 135, c.startcp / 2, 50));
        nodepoints.push(createPoint(200, -x * c.angle + 90, 100, 100));
        nodepoints.push(createPoint(300, -x * c.angle + 45, 50, c.startcp / 3));
    }
    nodepoints.push(createPoint(c.largeCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createKringleKnot() {
    var c = getControls(4);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(300, -x * c.angle - c.angle / 5, c.angle, c.midcp / 2));
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle, -c.midcp, -c.midcp));
        nodepoints.push(createPoint(300, -x * c.angle + c.angle / 5, c.midcp / 2, c.angle));
    }
    nodepoints.push(createPoint(c.largeCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createYetterKnot() {
    var c = getControls(4);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(300, -x * c.angle - c.angle / 5, c.angle, c.midcp / 2));
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle + 180, c.midcp, c.midcp));
        nodepoints.push(createPoint(300, -x * c.angle + c.angle / 5, c.midcp / 2, c.angle));
    }
    nodepoints.push(createPoint(c.largeCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createSardinaKnot() {
    var c = getControls(4);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(300, -x * c.angle - c.angle / 5, c.angle, c.midcp / 2));
        if ( x % 2 ) {
            nodepoints.push(createPoint(c.smallCircle * 2, -x * c.angle, -c.midcp / 2, -c.midcp / 2));
        } else {
            nodepoints.push(createPoint(c.smallCircle, -x * c.angle + 180, c.midcp, c.midcp));
        }
        nodepoints.push(createPoint(300, -x * c.angle + c.angle / 5, c.midcp / 2, c.angle));
    }
    nodepoints.push(createPoint(c.largeCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createSardina2Knot() {
    var c = getControls(4);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(300, -x * c.angle + c.angle / 3, -c.startcp / 3, -c.midcp));
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + 180, -c.midcp, -c.midcp));
        nodepoints.push(createPoint(300, -x * c.angle - c.angle / 3, -c.midcp, -c.startcp / 3));
    }
    nodepoints.push(createPoint(c.smallCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createPeesoKnot() {
    var c = getControls(2);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle + c.angle / 2, c.startcp, c.startcp));
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + 180, c.midcp, c.midcp));
    }
    nodepoints.push(createPoint(c.smallCircle, -(c.knots - 1) * c.angle - c.angle / 2, c.startcp, c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createPitonKnot() {
    var c = getControls(2);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.smallCircle, 180 + 4 * x * c.angle - c.angle * 2, -c.startcp, -c.startcp));
        nodepoints.push(createPoint(c.largeCircle, 180 + (4 - c.knots) * x * c.angle, -c.midcp, -c.midcp));
    }
    nodepoints.push(createPoint(c.smallCircle, 180 + 4 * (c.knots - 1) * c.angle + c.angle * 2, -c.startcp, -c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createRattanKnot() {
    var c = getControls(2);
    var nodepoints = [];
    for ( var x = 0; x < c.knots; x++ ) {
        nodepoints.push(createPoint(c.smallCircle, -x * c.angle + c.angle / 2, -c.startcp, -c.startcp));
        nodepoints.push(createPoint(c.largeCircle, -x * c.angle + 180, -c.midcp, -c.midcp));
    }
    nodepoints.push(createPoint(c.smallCircle, -(c.knots - 1) * c.angle - c.angle / 2, -c.startcp, -c.startcp));
    nodepoints.splice(c.show);
    nodepoints[0].mode = "start";
    nodepoints[nodepoints.length - 1].mode = "end";
    return nodepoints;
}

function createPoint(size, angle, cp1, cp2) {
    angle += 90;
    let x = size * Math.cos(angle * Math.PI / 180);
    let y = -size * Math.sin(angle * Math.PI / 180);
    let cpx1 = x + cp1 * Math.cos((angle + 90) * Math.PI / 180);
    let cpy1 = y - cp1 * Math.sin((angle + 90) * Math.PI / 180);
    let cpx2 = x + cp2 * Math.cos((angle - 90) * Math.PI / 180);
    let cpy2 = y - cp2 * Math.sin((angle - 90) * Math.PI / 180);
    return { p : { x, y }, cp1 : {x: cpx1, y: cpy1 }, cp2 : {x:cpx2, y:cpy2}};
}

function createPointString(d) {
    if ( d.mode === 'start' ) {
        return `M${d.p.x},${d.p.y} C${d.cp2.x},${d.cp2.y}`;
    } else if ( d.mode === 'end' ) {
        return `${d.cp1.x},${d.cp1.y} ${d.p.x},${d.p.y}`;
    } else if ( d.mode === 'close' ) {
        return `${d.cp1.x},${d.cp1.y} ${d.p.x},${d.p.y} Z`;
    } else {
        return `${d.cp1.x},${d.cp1.y} ${d.p.x},${d.p.y} ${d.cp2.x},${d.cp2.y}`;
    }
}

function loadPreset_old(g, newData) {
    var currentData = [];
    for ( var i = 0; i < g.data().length; i++ ) {
        currentData[i] = {...g.data()[i], ...newData[i] } ;
    }
    g.data(currentData).join('g');
    updateSliders(g);
    updateMat();
}
function loadPreset(mat, variant) {
    matType = mat;
    var g = d3.select('#sliders').selectAll('g');
    var type = control_flags['Dev'] ? 'dev' : 'mat';
    var currentData = [];
    for ( var i = 0; i < g.data().length; i++ ) {
        currentData[i] = {...g.data()[i],
            ...presets[mat][type][i],
            ...presets[mat][variant][i],

        };
    }
    currentData.every(d => d.y = d3.scaleLinear().range([sliderCtrl.height - 10,10]).clamp(true).domain([d.min, d.max])(d.value));
    g.data(currentData).join('g');
    updateSliders(g);
    updateMat();
}

function definePresets() {
    return {
        S:{
            mat: [ 
                { min: '3', max: '3' }, // Knots
                { min: '50', max: '300' }, // Large Circle
                { min: '1', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '75' }, // Large Circle
                { value: '12' }, // Small Circle
                { value: '24' }, // Start Control Points
                { value: '15' }, // Middle Control Points
                { value: '25', max: '25' } // Segments to show
            ],
        },
        Pe:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '135' }, // Large Circle
                { value: '60' }, // Small Circle
                { value: '50' }, // Start Control Points
                { value: '33' }, // Middle Control Points
                { value: '7', max: '7' } // Segments to show
            ],
            '3a': [
                { value: '3' }, // Knots
                { value: '173' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '36' }, // Start Control Points
                { value: '60' }, // Middle Control Points
                { value: '7', max: '7' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '188' }, // Large Circle
                { value: '99' }, // Small Circle
                { value: '70' }, // Start Control Points
                { value: '55' }, // Middle Control Points
                { value: '9', max: '9' } // Segments to show
            ],
            '4a': [
                { value: '4' }, // Knots
                { value: '245' }, // Large Circle
                { value: '95' }, // Small Circle
                { value: '35' }, // Start Control Points
                { value: '69' }, // Middle Control Points
                { value: '9', max: '9' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '169' }, // Large Circle
                { value: '43' }, // Small Circle
                { value: '45' }, // Start Control Points
                { value: '65' }, // Middle Control Points
                { value: '11', max: '11' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '169' }, // Large Circle
                { value: '43' }, // Small Circle
                { value: '24' }, // Start Control Points
                { value: '65' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            '6a': [
                { value: '6' }, // Knots
                { value: '185' }, // Large Circle
                { value: '77' }, // Small Circle
                { value: '40' }, // Start Control Points
                { value: '68' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            7: [
                { value: '7' }, // Knots
                { value: '251' }, // Large Circle
                { value: '52' }, // Small Circle
                { value: '26' }, // Start Control Points
                { value: '67' }, // Middle Control Points
                { value: '15', max: '15' } // Segments to show
            ]
        },
        Pi:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '173' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '36' }, // Start Control Points
                { value: '60' }, // Middle Control Points
                { value: '7', max: '7' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '200' }, // Large Circle
                { value: '100' }, // Small Circle
                { value: '36' }, // Start Control Points
                { value: '55' }, // Middle Control Points
                { value: '11', max: '11' } // Segments to show
            ],
            7: [
                { value: '7' }, // Knots
                { value: '149' }, // Large Circle
                { value: '115' }, // Small Circle
                { value: '23' }, // Start Control Points
                { value: '16' }, // Middle Control Points
                { value: '15', max: '15' } // Segments to show
            ],
            9: [
                { value: '9' }, // Knots
                { value: '188' }, // Large Circle
                { value: '157' }, // Small Circle
                { value: '26' }, // Start Control Points
                { value: '18' }, // Middle Control Points
                { value: '19', max: '19' } // Segments to show
            ]
        },
        R:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '200' }, // Large Circle
                { value: '100' }, // Small Circle
                { value: '14' }, // Start Control Points
                { value: '10' }, // Middle Control Points
                { value: '7', max: '7' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '214' }, // Large Circle
                { value: '94' }, // Small Circle
                { value: '36' }, // Start Control Points
                { value: '55' }, // Middle Control Points
                { value: '9', max: '9' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '200' }, // Large Circle
                { value: '100' }, // Small Circle
                { value: '36' }, // Start Control Points
                { value: '55' }, // Middle Control Points
                { value: '11', max: '11' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '173' }, // Large Circle
                { value: '79' }, // Small Circle
                { value: '20' }, // Start Control Points
                { value: '26' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            7: [
                { value: '7' }, // Knots
                { value: '200' }, // Large Circle
                { value: '155' }, // Small Circle
                { value: '52' }, // Start Control Points
                { value: '40' }, // Middle Control Points
                { value: '15', max: '15' } // Segments to show
            ],
            '7a': [
                { value: '7' }, // Knots
                { value: '200' }, // Large Circle
                { value: '100' }, // Small Circle
                { value: '52' }, // Start Control Points
                { value: '40' }, // Middle Control Points
                { value: '15', max: '15' } // Segments to show
            ],
            '7b': [
                { value: '7' }, // Knots
                { value: '211' }, // Large Circle
                { value: '155' }, // Small Circle
                { value: '52' }, // Start Control Points
                { value: '40' }, // Middle Control Points
                { value: '15', max: '15' } // Segments to show
            ],
            8: [
                { value: '8' }, // Knots
                { value: '192' }, // Large Circle
                { value: '96' }, // Small Circle
                { value: '7' }, // Start Control Points
                { value: '46' }, // Middle Control Points
                { value: '17', max: '17' } // Segments to show
            ],
            9: [
                { value: '9' }, // Knots
                { value: '208' }, // Large Circle
                { value: '87' }, // Small Circle
                { value: '8' }, // Start Control Points
                { value: '45' }, // Middle Control Points
                { value: '19', max: '19' } // Segments to show
            ]
        },
        Y:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '175' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '23' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '200' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '26' }, // Middle Control Points
                { value: '17', max: '17' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '200' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '26' }, // Middle Control Points
                { value: '21', max: '21' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '200' }, // Large Circle
                { value: '75' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '26' }, // Middle Control Points
                { value: '25', max: '25' } // Segments to show
            ],
            7: [
                { value: '7' }, // Knots
                { value: '222' }, // Large Circle
                { value: '75' }, // Small Circle
                { value: '8' }, // Start Control Points
                { value: '27' }, // Middle Control Points
                { value: '29', max: '29' } // Segments to show
            ],
            8: [
                { value: '8' }, // Knots
                { value: '261' }, // Large Circle
                { value: '76' }, // Small Circle
                { value: '7' }, // Start Control Points
                { value: '31' }, // Middle Control Points
                { value: '33', max: '33' } // Segments to show
            ],
            9: [
                { value: '9' }, // Knots
                { value: '261' }, // Large Circle
                { value: '87' }, // Small Circle
                { value: '7' }, // Start Control Points
                { value: '31' }, // Middle Control Points
                { value: '37', max: '37' } // Segments to show
            ],
            'x10': [
                { value: '10' }, // Knots
                { value: '261' }, // Large Circle
                { value: '99' }, // Small Circle
                { value: '7' }, // Start Control Points
                { value: '31' }, // Middle Control Points
                { value: '41', max: '41' } // Segments to show
            ]
        },
        Sa:{
            mat: [ 
                { min: '4', max: '12' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '158' }, // Large Circle
                { value: '32' }, // Small Circle
                { value: '15' }, // Start Control Points
                { value: '27' }, // Middle Control Points
                { value: '17', max: '17' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '200' }, // Large Circle
                { value: '40' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '20' }, // Middle Control Points
                { value: '25', max: '25' } // Segments to show
            ],
            8: [
                { value: '8' }, // Knots
                { value: '200' }, // Large Circle
                { value: '43' }, // Small Circle
                { value: '6' }, // Start Control Points
                { value: '18' }, // Middle Control Points
                { value: '33', max: '33' } // Segments to show
            ],
            'x10': [
                { value: '10' }, // Knots
                { value: '235' }, // Large Circle
                { value: '53' }, // Small Circle
                { value: '5' }, // Start Control Points
                { value: '19' }, // Middle Control Points
                { value: '41', max: '41' } // Segments to show
            ],
            'x12': [
                { value: '12' }, // Knots
                { value: '244' }, // Large Circle
                { value: '71' }, // Small Circle
                { value: '4' }, // Start Control Points
                { value: '20' }, // Middle Control Points
                { value: '49', max: '49' } // Segments to show
            ]
        },
        S2:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '50', max: '200' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '90' }, // Large Circle
                { value: '17' }, // Small Circle
                { value: '32' }, // Start Control Points
                { value: '17' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '85' }, // Large Circle
                { value: '35' }, // Small Circle
                { value: '33' }, // Start Control Points
                { value: '19' }, // Middle Control Points
                { value: '17', max: '17' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '91' }, // Large Circle
                { value: '39' }, // Small Circle
                { value: '32' }, // Start Control Points
                { value: '20' }, // Middle Control Points
                { value: '21', max: '21' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '99' }, // Large Circle
                { value: '67' }, // Small Circle
                { value: '22' }, // Start Control Points
                { value: '51' }, // Middle Control Points
                { value: '25', max: '25' } // Segments to show
            ]
        },
        K:{
            mat: [ 
                { min: '3', max: '9' }, // Knots
                { min: '100', max: '300' }, // Large Circle
                { min: '10', max: '200' }, // Small Circle
                { min: '0', max: '70' }, // Start Control Points
                { min: '0', max: '80' }, // Middle Control Points
                { min: '2', max: '17' } // Segments to show
            ],
            3: [
                { value: '3' }, // Knots
                { value: '140' }, // Large Circle
                { value: '20' }, // Small Circle
                { value: '15' }, // Start Control Points
                { value: '25' }, // Middle Control Points
                { value: '13', max: '13' } // Segments to show
            ],
            4: [
                { value: '4' }, // Knots
                { value: '200' }, // Large Circle
                { value: '50' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '26' }, // Middle Control Points
                { value: '17', max: '17' } // Segments to show
            ],
            5: [
                { value: '5' }, // Knots
                { value: '200' }, // Large Circle
                { value: '60' }, // Small Circle
                { value: '15' }, // Start Control Points
                { value: '20' }, // Middle Control Points
                { value: '21', max: '21' } // Segments to show
            ],
            6: [
                { value: '6' }, // Knots
                { value: '200' }, // Large Circle
                { value: '60' }, // Small Circle
                { value: '15' }, // Start Control Points
                { value: '20' }, // Middle Control Points
                { value: '25', max: '25' } // Segments to show
            ],
            7: [
                { value: '7' }, // Knots
                { value: '200' }, // Large Circle
                { value: '84' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '15' }, // Middle Control Points
                { value: '29', max: '29' } // Segments to show
            ],
            8: [
                { value: '8' }, // Knots
                { value: '200' }, // Large Circle
                { value: '84' }, // Small Circle
                { value: '10' }, // Start Control Points
                { value: '15' }, // Middle Control Points
                { value: '33', max: '33' } // Segments to show
            ],
            9: [
                { value: '9' }, // Knots
                { value: '200' }, // Large Circle
                { value: '120' }, // Small Circle
                { value: '8' }, // Start Control Points
                { value: '13' }, // Middle Control Points
                { value: '37', max: '37' } // Segments to show
            ],
            'x10': [
                { value: '10' }, // Knots
                { value: '200' }, // Large Circle
                { value: '120' }, // Small Circle
                { value: '8' }, // Start Control Points
                { value: '13' }, // Middle Control Points
                { value: '41', max: '41' } // Segments to show
            ]
        }
    }
};

Object.keys(presets).forEach( d => presets[d]['dev'] = getSliderDevDefs());

loadPreset('Y', 4);
updateMat();
