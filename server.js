var express = require('express'),
	stylus = require('stylus'),
	logger = require('morgan'),
	bodyParser = require('body-parser'),
	mongoose = require('mongoose');

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var app = express();

//MIDDLEWARE
function compile(str, path) {
	return stylus(str).set('filename', path);
}
app.set('views', __dirname + '/server/views');
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(stylus.middleware (
	{
		src: __dirname + '/public',
		compile: compile
	}
));
app.use(express.static(__dirname + '/public'));

//DATABASE
//if (env === 'development') {
	//mongoose.connect('mongodb://localhost/creating_apps');
//} else {
	//mongoose.connect('mongodb://marco:creating_apps@linus.mongohq.com:10037/creating_apps');
//}

mongoose.connect('mongodb://marco:creating_apps@linus.mongohq.com:10037/creating_apps');


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error..'));
db.once('open', function callback() {
	console.log('creating apps db opened');
});
//var messageSchema = mongoose.Schema({message: String});
//var Message = mongoose.model('Message', messageSchema);
//var mongoMessage;
//Message.findOne().exec(function(err, messageDoc) {
	//mongoMessage = messageDoc.message;
//});

//ROUTES
app.get('/partials/:partialPath', function(req, res) {
	res.render('partials/' + req.params.partialPath);
});

app.get('*', function(req, res) {
	res.render('index', {
		//mongoMessage: mongoMessage
	});
});

//SERVER LISTENER
var port = process.env.PORT || 3030;
app.listen(port);
console.log('Listening on port ' + port + '...');