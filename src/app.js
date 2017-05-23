var restify = require('restify');
var mod_request = require('request');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var dns = require('dns');
var geoip = require('geoip-lite');


var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

server.use(restify.authorizationParser());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser(
{
	    mapParams:false,
    mapFiles:true,
	multiples:true
}));
    fs   = require('fs-extra');
var urlMongo = 'mongodb://localhost:27017/aesys';


server.get('/', function indexHTML(req, res, next) {
    
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(fs.readFileSync(__dirname + '/view/index.html', 'utf8'));

		});

server.get('/users', 
function(req, res, next){
	var r={};
 var func=new Promise(function (fulfill, reject){

	MongoClient.connect(urlMongo, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', urlMongo);
  var collection = db.collection('users');

	collection.find().toArray(function (err, result) {
      if (err) {
        console.log(err);
      } else if (result.length) {
        console.log('Found:', result);
			r=result;
  fulfill(r);

      } else {
console.log('No document(s) found with defined "find" criteria!');
      }
	    });


    //Close connection
    db.close();
	}
  });
	}).then(function(r){
res.send(r);
	});
});

server.post('/user', 
function(req, res, data, next){
var user=   req.body ;
MongoClient.connect(urlMongo, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', urlMongo);
  var collection = db.collection('users');
user.headers=req.headers;
if(req.body.ip!=undefined && req.body.ip!=""){
	user.clientIPaddr=req.body.ip;
}
else
{
  if (req.headers['via']) { // yes
        user.clientIPaddr = req.headers['x-forwarded-for'];
        user.clientProxy = req.headers['via'];
    } else { // no
        user.clientIPaddr = req.connection.remoteAddress;
        user.clientProxy = "none";
    }
	user.ip=user.clientIPaddr;
  }
 var func=new Promise(function (fulfill, reject){
	user.geo = geoip.lookup(user.clientIPaddr);

	var url = 'http://freegeoip.net/json/' + user.clientIPaddr
mod_request.get(url, function(error, resp, body, next) {
      user.freeGeoIp= body;
});
	  url = 'http://ip-api.com/json/?' + user.clientIPaddr
mod_request.get(url, function(error, resp, body, next) {
      user.ipApi= body;
});
dns.lookupService(user.clientIPaddr, 3000, (err, hostname, service, next) => {
user.dnsLookUp={'hostname': hostname , 'service':service};
});
dns.reverse(user.clientIPaddr, (err, hostnames, next) => {
		user.dnsReverse={'hostnames': hostnames };
});

fulfill(user);
	}).then(function(){
	collection.insert(user, function (err, result) {
    if (err) {
      console.log(err);
   } else {
      console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result);
   }
	});
    res.send(user);
		});

    //Close connection
    db.close();
	}
  });
});

server.get(/\/?.*/, restify.serveStatic({
            directory: __dirname+'/view',
            default: 'index.html',
            match: /^((?!app.js).)*$/   // we should deny access to the application source
     }));

	 server.listen(3000, function () {
  console.log('%s listening at %s', server.name, server.url);
});