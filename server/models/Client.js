const mongoose = require('mongoose');
const slugPlugin = require('./plugins/slug');

const clientSchema = new mongoose.Schema({
	name: {type:String, required:'{PATH} is required!'},
	slug: { type:String, index: { unique: true } },
	featured: {type:Boolean},
	published: { type : Date, default: Date.now },
	tags: {type:String},
	url: {type:String},
	photo: {type:String},
	description: {type:String}
});

clientSchema.plugin(slugPlugin, { source: 'name', target: 'slug' });
const Client = mongoose.model('Client', clientSchema);

// An empty database starts with the clients from the old site.
Client.createDefaultClients = async () => {
	if ((await Client.countDocuments()) > 0) return;
	await Client.create([
		{name: 'Hacker Firm', 
				featured: true, 
				published: new Date('2016-05-04'), 
				tags: '', 
				url: "https://www.hackerfirm.com/",
				photo: "../images/thumbnails/hacker_firm.png",
				description: "Designed and developed the website for The Hacker Firm using a NodeJS back end and a AngularJS front end."},
		{name: 'ING', 
				featured: true, 
				published: new Date('2015-11-30'), 
				tags: '', 
				url: "https://www.ingdirect.com.au/securebanking/",
				photo: "../images/thumbnails/ing.png",
				description: "Developed the front-end for the new banking portal of ING. The portal will be internationalized and exported into other regions."},
		{name: 'Service NSW', 
				featured: true, 
				published: new Date('2015-05-18'), 
				tags: '', 
				url: "http://service.nsw.gov.au",
				photo: "../images/thumbnails/service_nsw.png",
				description: "I developed the front-end for the NSW goverment portal. I use AngularJS and Bootstrap for the UI/UX. The website has 20M+ uniques a month and has been developed to comply with WCAG standards."},
		{name: 'SMH', 
				featured: true, 
				published: new Date('2014-12-20'), 
				tags: '', 
				url: "http://www.smh.com.au",
				photo: "../images/thumbnails/sydney_morning_herald.png",
				description: "I developed widgets to be used in the Sydney Morning Herald, Australia's biggest newspaper. They were optimized for speed and high device coverage"},
		{name: 'CRE', 
				featured: true, 
				published: new Date('2014-10-26'), 
				tags: '', 
				url: "http://www.commercialrealestate.com.au",
				photo: "../images/thumbnails/cre.png",
				description: "I rebuilt Commercial Real Estate into a single page application using KnockoutJS. The back end is done in C# and connects to the front-end using API calls. Besides KnockoutJS I use Foundation to make the website responsive and CSS3 animations."},
		{name: 'LawPath', 
				featured: true, 
				published: new Date('2014-07-01'), 
				tags: '', 
				url: "http://www.lawpath.com.au",
				photo: "../images/thumbnails/lawpath.png",
				description: "As the first engineering hire, I built LawPath from the ground up using Ruby on Rails for the back-end and AngularJS for the front-end. Besides that we used a PostgreSQL db and used logarithmic matching for our clients."}
	]);
};

module.exports = Client;
