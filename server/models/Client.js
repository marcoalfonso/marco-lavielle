var mongoose = require('mongoose');

var clientSchema = mongoose.Schema({
	name: {type:String, required:'{PATH} is required!'},
	featured: {type:Boolean, required:'{PATH} is required!'},
	published: {type:Date, required:'{PATH} is required!'},
	tags: {type:String},
	url: {type:String},
	photo: {type:String},
	description: {type:String}
});

var Client = mongoose.model('Client', clientSchema);

function createDefaultClients() {
	Client.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			Client.create({name: 'Service NSW', 
				featured: true, 
				published: new Date('18/05/2015'), 
				tags: ['AngularJS'], 
				url: "http://service.nsw.gov.au",
				photo: "../images/thumbnails/service_nsw.png",
				description:"I developed the front-end for the NSW goverment portal. I use AngularJS and Bootstrap for the UI/UX. The website has 20M+ uniques a month and has been developed to comply with WCAG standards."});
			Client.create({name: 'Commercial Real Estate', 
				featured: true, 
				published: new Date('25/10/2014'), 
				tags: ['KnockoutJS'], 
				url: "http://www.commercialrealestate.com.au",
				photo: "../images/thumbnails/cre.png",
				description: "I rebuilt Commercial Real Estate into a single page application using KnockoutJS. The back end is done in C# and connects to the front-end using API calls. Besides KnockoutJS I use Foundation to make the website responsive and CSS3 animations."});
		    Client.create({name: 'LawPath', 
		    	featured: true, 
		    	published: new Date('01/07/2014'), 
		    	tags: ['Ruby On Rails'], 
		    	url: "http://www.lawpath.com.au",
		    	photo: "../images/thumbnails/lawpath.png",
		    	description: "As the first engineering hire, I built LawPath from the ground up using Ruby on Rails for the back-end and AngularJS for the front-end. Besides that we used a PostgreSQL db and used logarithmic matching for our clients."});
		    Client.create({name: 'A-lift', 
		    	featured: false, 
		    	published: new Date('12/11/2013'), 
		    	tags: ['Wordpress'], 
		    	url: "http://www.alift.co",
		    	photo: "../images/thumbnails/a_lift.png",
		    	description: "I created the A-lift corporate website using a heavily customized wordpress theme. The website is fully responsive and has many social features integrated."});
		    Client.create({name: 'Ad-Roller', 
		    	featured: false, 
		    	published: new Date('13/01/2014'), 
		    	tags: ['Wordpress'], 
		    	url: "http://www.ad-roller.com.au",
		    	photo: "../images/thumbnails/ad_roller.png",
		    	description: "The website of Ad-roller was done using wordpress. I started with an empty theme and built the whole UI and UX using several wordpress libraries."});
		}
	})
}

exports.createDefaultClients = createDefaultClients;