// Orbitron, the squared-off display face used for futuristic lettering
// (the homepage cube, the sign-in form). Loaded on demand by the pages that
// use it, so it travels with them.
const loadOrbitron = () => {
  if (document.getElementById("orbitron-font")) return;
  const link = document.createElement("link");
  link.id = "orbitron-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&display=swap";
  document.head.appendChild(link);
};

export default loadOrbitron;
