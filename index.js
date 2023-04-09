
const express = require('express');
const got = require('got');
const app = express();
const server = app.listen(process.env.PORT || 3000, () => console.log("listening"));

const baseurl = "https://bunnyms.github.io/audio";
const basecat = "https://bunnyms.github.io/";

//https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript/6234804#6234804
const escapeHtml = u=>u.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

app.get("/", async (req, res)=>{
	const list = await got.get(basecat+"list.json").json();
	console.log(list, req.query.n)
	const trackjson =  await got.get(basecat+list[req.query.n||0]).json();
	let mixerDemos="";
	let n = 0;
	
	trackjson.versions.forEach(ver=>{
		mixerDemos+=`			<div id="mixer-${n}-demo" class="mixer-demo" data-title="${escapeHtml(trackjson.name)} - ${escapeHtml(ver.name)}" data-creator="${escapeHtml(trackjson.artists)}">\n`;
		if(ver.stems.length>0) {
			ver.stems.forEach(stem=>{
				mixerDemos+=`				<div class="track" data-title="${escapeHtml(stem.name)}" data-url="${baseurl+stem.file}"></div>\n`;
			});
		} else {
			mixerDemos+=`				<div class="track" data-title="Full" data-url="${baseurl+ver.file}"></div>\n`;
		}
		n++;
		mixerDemos+="			</div>\n";
	});
	
	
	
	const html = `
	<!DOCTYPE html>
	<html lang="en">
	<head> 
		<title>BunnyMS Web Mixer</title>
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="stylesheet" href="https://use.typekit.net/alb1dvj.css">
		<link rel="stylesheet" href="css/nice-select.css?v179">
		<link rel="stylesheet" href="css/mixer.css?v179">
		<link rel="stylesheet" href="css/stylesheet.css?v179">
		<link rel="shortcut icon" href="/images/favicn.ico">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.js"></script>
	</head>
	<body>
	<div class="wrapper">
		
	
		<div class="mixer">
${mixerDemos}		</div>
	</div>
	
	<script src="js/jquery.nice-select.js?v179"></script>
	<script src="js/rangeslider.js?v179"></script>
	<script src="js/mixer.js?v179"></script>
	</body>
	</html>
	`;
	res.send(html)
	
});


app.use(express.static("static"));
