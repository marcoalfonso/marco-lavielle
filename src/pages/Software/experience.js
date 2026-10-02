// Work history, education, languages and tech, from the CV. Latest first.

export const EXPERIENCE = [
  {
    id: "qantas-2024",
    company: "Qantas",
    role: "Senior Front End Engineer",
    from: "2024-08",
    to: null,
    image: "/images/thumbnails/qantas.png",
    url: "https://www.qantas.com",
    summary:
      "Building the new Qantas.com experience using NextJS, Typescript and React, and managing deployments in Kubernetes. The app has a focus on high code quality, performance and security, with high test coverage: unit tests in Jest and end to end tests in Cypress.",
    tech: ["NextJS", "TypeScript", "React", "Kubernetes", "Jest", "Cypress"],
  },
  {
    id: "iag",
    company: "IAG",
    role: "Senior Full Stack Engineer",
    from: "2021-10",
    to: "2024-07",
    image: "/images/thumbnails/iag.png",
    url: "https://www.iag.com.au",
    summary:
      "Worked on the rewrite from scratch of IAG's Broker Portal, using React, Redux, Typescript, Hooks, Node, Express and functional programming. Created mid layer Node APIs to talk to other backend services and authentication, and a Typescript model shared between the Node mid layer and the front end. Also worked on features of a legacy app built with React, GraphQL and Apollo.",
    tech: ["React", "Redux", "TypeScript", "Node", "Express", "GraphQL", "Apollo"],
  },
  {
    id: "telstra-purple",
    company: "Telstra Purple",
    role: "Senior Front End Engineer",
    from: "2019-09",
    to: "2021-09",
    image: "/images/thumbnails/telstra_purple.png",
    url: "https://purple.telstra.com",
    summary:
      "Worked with Dragonfly Technologies building a drag and drop automation tool for Telstra Purple, using React, Redux, Typescript and CSS Modules. The UI is very complex (a developer tool) and has a code editor implemented with Monaco Editor.",
    tech: ["React", "Redux", "TypeScript", "CSS Modules", "Monaco Editor"],
  },
  {
    id: "service-nsw",
    company: "Service NSW",
    role: "Lead JavaScript Engineer",
    from: "2018-07",
    to: "2019-08",
    image: "/images/thumbnails/service_nsw.png",
    url: "https://www.service.nsw.gov.au",
    summary:
      "Worked on building the main account page and the pet registration and firearms registration forms for the NSW state government. These applications are extremely high volume and talk to several external APIs. Built Node mid layer APIs to communicate with these services; the front ends were built with React, Redux, Node and Express.",
    tech: ["React", "Redux", "Node", "Express"],
  },
  {
    id: "dta",
    company: "Digital Transformation Agency",
    role: "Senior Front End Engineer",
    from: "2017-07",
    to: "2018-07",
    image: "/images/thumbnails/marketplace.png",
    url: "https://marketplace.service.gov.au",
    extraLink: { label: "Open source on GitHub", href: "https://github.com/AusDTO" },
    summary:
      "Built open source projects for the Australian federal government using React, Node, Express, Webpack, ES6 and D3.",
    tech: ["React", "Node", "Express", "Webpack", "ES6", "D3"],
  },
  {
    id: "qantas-2016",
    company: "Qantas",
    role: "Senior Front End Engineer",
    from: "2016-05",
    to: "2017-07",
    image: "/images/thumbnails/qantas.png",
    url: "https://www.qantas.com",
    summary:
      "Worked on several Qantas projects using React, Node, Redux, Webpack and ES6: the single sign on login widget, the Qantas loyalty points activity page, the Qantas Business Rewards redesign and the Qantas Money website integrated with Contentful. All the front ends were built to WCAG 2.0 accessibility compliance.",
    tech: ["React", "Node", "Redux", "Webpack", "ES6", "Contentful", "WCAG 2.0"],
  },
  {
    id: "deloitte",
    company: "Deloitte",
    client: "ING",
    role: "Senior Front End Engineer",
    from: "2015-05",
    to: "2016-05",
    image: "/images/thumbnails/ing.png",
    url: "https://www.ing.com.au",
    summary:
      "Built the ING banking portal front end using Angular, focusing on high coverage of unit tests and accessibility requirements.",
    tech: ["Angular", "Unit testing", "Accessibility"],
  },
  {
    id: "fairfax",
    company: "Fairfax Media",
    client: "Domain · SMH · AFR",
    role: "Senior Front End Engineer",
    from: "2014-07",
    to: "2015-05",
    image: "/images/thumbnails/cre.png",
    url: "https://www.commercialrealestate.com.au",
    summary:
      "Redesigned from scratch the front end of Domain's commercial real estate site. Also built widgets for the Sydney Morning Herald and the Financial Review in Angular, optimised for speed (4M+ views) and high device and browser coverage.",
    tech: ["Angular", "Performance", "Responsive"],
  },
  {
    id: "lawpath",
    company: "Lawpath",
    role: "Ruby on Rails Engineer",
    from: "2012-08",
    to: "2014-07",
    image: "/images/thumbnails/lawpath.png",
    url: "https://lawpath.com.au",
    summary:
      "Helped grow the product from MVP to a successful second round of funding, using Ruby on Rails, PostgreSQL, Angular and Bootstrap to build the legal platform.",
    tech: ["Ruby on Rails", "PostgreSQL", "Angular", "Bootstrap"],
  },
];

export const EDUCATION = [
  { degree: "Master of Business Administration", school: "University of Technology Sydney", from: "2009-07", to: "2011-08" },
  { degree: "Startup Engineering", school: "Stanford University", from: "2013-06", to: "2013-09" },
  { degree: "Bachelor Degree in Business", school: "Monterrey Institute of Technology", from: "2005-08", to: "2008-08" },
];

export const LANGUAGES = ["English", "Spanish", "JavaScript"];

export const TECH = [
  "React", "Node", "Redux", "NextJS", "GraphQL", "Apollo", "ES6",
  "MongoDB", "Mongoose", "Express", "PostgreSQL", "Webpack", "AWS",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2021-10" -> "Oct 2021"; null -> "Present"
export const monthYear = (ym) => {
  if (!ym) return "Present";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

// "2 yrs 10 mos", counting both end months
export const duration = (from, to) => {
  const [fy, fm] = from.split("-").map(Number);
  const end = to ? to.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const months = (end[0] - fy) * 12 + (end[1] - fm) + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
};
