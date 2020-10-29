var mongoose = require('mongoose'),
	monguurl = require('monguurl');

var clientSchema = mongoose.Schema({
	name: {type:String, required:'{PATH} is required!'},
	slug: { type:String, index: { unique: true } },
	featured: {type:Boolean},
	published: {type:Date},
	tags: {type:String},
	url: {type:String},
	photo: {type:String},
	description: {type:String}
});

clientSchema.plugin(monguurl({
  source: 'name',
  target: 'slug'
}));
var Client = mongoose.model('Client', clientSchema);

function createDefaultClients() {
	Client.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			Client.create({name: 'Hacker Firm', 
				featured: true, 
				published: new Date('04/05/2016'), 
				tags: '', 
				url: "https://www.hackerfirm.com/",
				photo: "../images/thumbnails/hacker_firm.png",
				description: "Designed and developed the website for The Hacker Firm using a NodeJS back end and a AngularJS front end."});
			Client.create({name: 'ING', 
				featured: true, 
				published: new Date('30/11/2015'), 
				tags: '', 
				url: "https://www.ingdirect.com.au/securebanking/",
				photo: "../images/thumbnails/ing.png",
				description: "Developed the front-end for the new banking portal of ING. The portal will be internationalized and exported into other regions."});
			Client.create({name: 'Service NSW', 
				featured: true, 
				published: new Date('18/05/2015'), 
				tags: '', 
				url: "http://service.nsw.gov.au",
				photo: "../images/thumbnails/service_nsw.png",
				description: "I developed the front-end for the NSW goverment portal. I use AngularJS and Bootstrap for the UI/UX. The website has 20M+ uniques a month and has been developed to comply with WCAG standards."});
			Client.create({name: 'SMH', 
				featured: true, 
				published: new Date('20/12/2014'), 
				tags: '', 
				url: "http://www.smh.com.au",
				photo: "../images/thumbnails/sydney_morning_herald.png",
				description: "I developed widgets to be used in the Sydney Morning Herald, Australia's biggest newspaper. They were optimized for speed and high device coverage"});
			Client.create({name: 'CRE', 
				featured: true, 
				published: new Date('26/10/2014'), 
				tags: '', 
				url: "http://www.commercialrealestate.com.au",
				photo: "../images/thumbnails/cre.png",
				description: "I rebuilt Commercial Real Estate into a single page application using KnockoutJS. The back end is done in C# and connects to the front-end using API calls. Besides KnockoutJS I use Foundation to make the website responsive and CSS3 animations."});
			Client.create({name: 'LawPath', 
				featured: true, 
				published: new Date('01/07/2014'), 
				tags: '', 
				url: "http://www.lawpath.com.au",
				photo: "../images/thumbnails/lawpath.png",
				description: "As the first engineering hire, I built LawPath from the ground up using Ruby on Rails for the back-end and AngularJS for the front-end. Besides that we used a PostgreSQL db and used logarithmic matching for our clients."});
		}
	});
}

exports.createDefaultClients = createDefaultClients;