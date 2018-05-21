const your_name_here = "YOURE NAME HERE";
const zipcode = YOUR ZIP CODE HERE;
const location_lat = YOUR LAT AND LONG;
const location_lon = YOUR LAT AND LONG;
const open_weather_map_appid = YOUR OPEN WEATHER MAP APP ID;

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const url = require('url')
const electronapp = require('express')();
const http = require('http').Server(electronapp);
const io = require('socket.io')(http);
const wallpaper = require('wallpaper');
const cron = require('node-cron');
const OpenWeatherMapHelper = require("openweathermap-node");
const timestamp = require("unix-timestamp");
const geoTz = require('geo-tz');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const request = require('request');
const os = require('os');
const cities = require('cities');
const SpotifyWebHelper = require('spotify-webhelper');
const spotify = new SpotifyWebHelper.SpotifyWebHelper();

let mainWindow
let desktopImage
let timeZone

const weather = new OpenWeatherMapHelper(
    {
        APPID: open_weather_map_appid,
        units: "fahrenheit"
    }
);

wallpaper.get().then(imagePath => {
	desktopImage = imagePath;
});


function createWindow () {
	const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({width: width, height: height, skipTaskbar: false, frame: false,autoHideMenuBar: true, opacity: 1, transparent: 1, enableLargerThanScreen: true, resizable: false, movable: false, minimizable: false, webPreferences: { webSecurity: false }})
	mainWindow.setSkipTaskbar(true);
  // and load the index.html of the app.
  mainWindow.loadURL("http://localhost:4958/")
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

electronapp.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

electronapp.get('/desktop/name',function(req, res){
	res.send(your_name_here)
})

electronapp.get('/desktop/image', function(req,res){
	res.sendFile(desktopImage);
})

io.on('connection', function(socket){
	socket.on("nowplaying",function(data){
		let statuss;
		spotify.getStatus(function (err, res) {
		  if (err) {
			return console.error(err);
		  }
		  const percent=(100/res.track.length)*res.playing_position;
		  const tetle = res.track.track_resource.name+" - "+res.track.artist_resource.name;
		 statuss = {title: tetle, playbackpercent: percent};
		 socket.emit("musicplaying",statuss)
		});
	})
	
	socket.on('weatherupdate',function(data){
		weather.getCurrentWeatherByZipCode(zipcode, (err, currentWeather) => {
			if(err){
			}
			else{
				let todaydesc;
				let dailydesc;
				let feelslike;
				let high;
				let low;
				let humidity;
				let SunRiseTime;
				let SunsetTime;
				let town = cities.zip_lookup(zipcode)["city"]+", "+cities.zip_lookup(zipcode)["state"];
				let lon = location_lon;
				let lat = location_lat;
				timeZone = geoTz(currentWeather["coord"]["lon"],currentWeather["coord"]["lat"]);
				let sunrise;
				let sunset;
				sunrise = timestamp.toDate(currentWeather["sys"]["sunrise"]);
				sunset = timestamp.toDate(currentWeather["sys"]["sunset"]);
				
				let customlat = lat.toFixed(3)
				let customlon = lon.toFixed(3)
				
				request(' https://darksky.net/forecast/'+customlat+','+customlon+'/us12/en', function (error, response, body) {
					const dom = new JSDOM(body);
					 todaydesc = dom.window.document.querySelector(".center .next").textContent;
					 dailydesc = dom.window.document.querySelector("#week .summary").textContent;
					 
					request('https://darksky.net/details/'+customlat+','+customlon+'/1526770146/us12/en.json', function (err, resp, rebody) {
					  const parsed = JSON.parse(rebody);
					  const currently = parsed["currently"];
					  const daily = parsed.daily.data[0];
					  feelslike = currently.apparentTemperature;
					  high = daily.apparentTemperatureHigh;
					  low = daily.apparentTemperatureLow;
					  humidity = currently.humidity;
					
						let sunriseAM = true;
						let sunsetAM = true;
						
						
						if (sunrise.getHours() >= 12){
							SunRiseTime = sunrise.getHours()-12 + ":";
							sunriseAM = false;
						}else{
							SunRiseTime = sunrise.getHours()+":";
						}
						if (sunset.getHours() >= 12){
							sunsetAM = false;
							SunsetTime = sunset.getHours()-12 + ":";
						}else{
							SunsetTime = sunset.getHours()+":";
						}
						
						let sunriseam;
						let sunsetam;
						if (sunriseAM == true){
							sunriseam = "AM"
						}else{
							sunriseam = "PM"
						}
						if (sunsetAM == true){
							sunsetam = "AM"
						}else{
							sunsetam = "PM"
						}
						
						sunRiseTime = SunRiseTime+sunrise.getMinutes()+" "+sunriseam;
						SunsetTime = SunsetTime+sunrise.getMinutes()+" "+sunsetam;
						
						let returning = ({
							Sunrise: sunRiseTime,
							Sunset: SunsetTime,
							Today: todaydesc,
							Daily: dailydesc,
							Feels: feelslike,
							High: high,
							Low: low,
							Humidity: humidity,
							town: town
						});
						
						
						socket.emit("weatherresp",returning);
					});
				});
			}
		});
	})
});

http.listen(4958, function(){
});