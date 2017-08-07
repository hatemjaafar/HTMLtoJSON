/**
 * Module dependencies.
 */
var express  = require('express'),
formidable   = require('formidable'),
fs           = require('fs'),
Path         = require('path'),
cheerio      = require('cheerio'),
jsonfile     = require('jsonfile'),
colors       = require('colors');

var app = express();

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

/* 
    Upload file and store it in directory "uploaded".
    Call the function that will make treatment of the uploded file.
    render result.
*/
app.post('/convert', function(req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (Path.extname(files.filetoupload.name) == '.html'){
            var oldpath = files.filetoupload.path;
            var path = __dirname + '/uploaded/';
            var newpath = path + files.filetoupload.name;
            if (!fs.existsSync(path)){
                fs.mkdirSync(path);
            }
            fs.rename(oldpath, newpath, function (err) {
                if (err) throw err;
                var html =fs.readFileSync(newpath, 'utf8');
                html = html.replace(/\\r\\n|\\/g, '');
                var $ = cheerio.load(html);
                json = getTrips($);
                res.setHeader('Content-Type', 'application/json');                
                res.send(JSON.stringify(json, null, 2));
            });
        }
        else
        {   
            res.send('format inconnu !');
        }
    }); 
})

/*
transform data from htlm to json according to the required format.
*/
function getTrips($)
{
    var code = $('.block-pnr').last().find('span').first().text().trim();
    var name = $('.block-pnr').last().find('span').last().text().trim();
    var totalPrice = $('.very-important').text().replace(',', '.').replace('€', '').trim();
    var roundTrips = [];
    var numItems = $('.product-details').length;
    var detail ;
    var train = [];
    $('.product-details').each(function(index, element)
    {
        detail = 
        {
            'type': $(this).find('.travel-way').text().trim(),
            'date': getDate($, index),
            'trains': getTrainDetail($, $(this), index, numItems)
        }
        roundTrips.push(detail);
    });

    // Get price.
    var prices = [];
    $('.cell').each(function(index, element)
    {
        if (index % 2 != 0)
        {
            price = {
                'value': Number($(this).text().replace(',', '.').replace('€', '').trim()),
            }
            prices.push(price);
        }
    }); 

    // Get amount.
    var ammount = {
       'value': Number($('.amount').text().replace(',', '.').replace('€', '').trim()),
    }
    prices.push(ammount);

    // Prepare jsonfile.
    var json = {
        'status': 'ok',
        'result':{
            'trips':[
                {
                    'code': code,
                    'name': name,
                    'details': {
                        'price': Number(totalPrice),
                        'roundTrips': roundTrips
                    },
                },
            ],
            'custom':{
                'prices':prices,
            }
            
        }
    };

    jsonfile.writeFile('result.json',json ,{spaces: 2},function (err) {
        if(err) console.error(err)
        console.log('The file' + ' result.json ' .green + 'has been generated in:'  .white + __dirname .green);
    });
    return json;
}

/*
get train detail.
*/
function getTrainDetail($, element, index, numItems)
{
    trains =[];
    var ride = {
        'departureTime': element.find('.segment-departure').first().text().replace('h',':').trim(),
        'departureStation': element.find('.origin-destination-station').first().text().trim(),
        'arrivalTime': element.find('.origin-destination-hour').last().text().replace('h',':').trim(),
        'arrivalStation': element.find('.origin-destination-station').last().text().trim(),
        'type': element.children().children().children().eq(3).text().trim(),
        'number': element.children().children().children().eq(4).text().trim()
    };
    if (index + 1 == numItems)
    { 
        ride.passengers = getPassengers($, numItems);
    }

    trains.push(ride);
    return trains;
}

/*
get passengers details.
*/
function getPassengers($, numItems)
{
    var passengers = [];
        for (var i = 1; i <= numItems; i++) 
        {
            var passenger = 
            {
                'type': 'échangeable',
                'age': $('.typology').first().text().split('r ')[1].trim()
            }
            passengers.push(passenger);
        }
 
    return passengers;
}

/*
Get trips Dates. 
*/
function getDate($, index)
{
    switch (index)
    {
        case 0:
            return  getFormatedDate($('.pnr-summary').first().text().substring(25, 35).trim());
            break;
        case 1:
            return  getFormatedDate($('.pnr-summary').first().text().trim().substr(-10));
            break;
        case 2:
            return 	getFormatedDate($('.pnr-summary').last().text().substring(28, 38).trim());
            break;
        case 3:
            return getFormatedDate($('.pnr-summary').last().text().trim().substr(-10));
        break;
    }
}

/*
Reformat date. 
*/
function getFormatedDate(date)
{   
    var splited = date.split('/');
    var formattedDate = [splited[2],splited[1],splited[0]].join("-");
    formattedDate = formattedDate + " 00:00:00.000Z";

    //var date = new Date (formattedDate);

    return formattedDate;	
}

app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.send('Page introuvable !');
});

app.listen(3000);