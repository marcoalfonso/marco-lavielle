import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";

const CarGame = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const carRef = useRef(null);
  const cameraRef = useRef(null);
  const keysPressed = useRef({});
  const carVelocity = useRef({ x: 0, z: 0 });
  const carRotation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const animationIdRef = useRef(null);
  const fireworksRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 20);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7cfc00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create roads
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Main road
    const mainRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 10),
      roadMaterial
    );
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.y = 0.01;
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // Cross road
    const crossRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 60),
      roadMaterial
    );
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.01;
    crossRoad.position.x = 20;
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // Create car
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carBody.position.y = 1;
    carBody.castShadow = true;
    carGroup.add(carBody);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(2.5, 1, 1.8);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
    const carRoof = new THREE.Mesh(roofGeometry, roofMaterial);
    carRoof.position.set(0, 2, 0);
    carRoof.castShadow = true;
    carGroup.add(carRoof);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const wheelPositions = [
      { x: -1.5, y: 0.5, z: 1 },
      { x: -1.5, y: 0.5, z: -1 },
      { x: 1.5, y: 0.5, z: 1 },
      { x: 1.5, y: 0.5, z: -1 },
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.x = Math.PI / 2; // Rotate around X-axis to make wheels horizontal
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Headlights
    // const headlightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    // const headlightMaterial = new THREE.MeshPhongMaterial({
    //   color: 0xffffaa,
    //   emissive: 0xffffaa,
    //   emissiveIntensity: 0.5,
    // });

    // const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    // leftHeadlight.position.set(2, 1, 0.7);
    // carGroup.add(leftHeadlight);

    // const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    // rightHeadlight.position.set(2, 1, -0.7);
    // carGroup.add(rightHeadlight);

    carGroup.position.set(0, 0, 0);
    // Initial car rotation to point forward (up direction in viewport)
    carGroup.rotation.y = Math.PI / 2; // Rotate 90 degrees to point up
    scene.add(carGroup);
    carRef.current = carGroup;

    // Store collision objects for reference
    const collisionObjects = [];

    // Create buildings
    const buildingMaterial1 = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const buildingMaterial2 = new THREE.MeshPhongMaterial({ color: 0x696969 });
    const buildingMaterial3 = new THREE.MeshPhongMaterial({ color: 0x4169e1 });

    // Building 1
    const building1 = new THREE.Mesh(
      new THREE.BoxGeometry(15, 20, 15),
      buildingMaterial1
    );
    building1.position.set(-30, 10, -20);
    building1.castShadow = true;
    building1.receiveShadow = true;
    // Create custom bounding box for building collision (not shadows)
    const building1BoundingBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-30, 1, -20), // center at ground level
      new THREE.Vector3(15, 2, 15) // building base dimensions only
    );

    building1.userData = {
      type: "building",
      boundingBox: building1BoundingBox,
    };
    scene.add(building1);
    collisionObjects.push(building1);

    // Building 2
    const building2 = new THREE.Mesh(
      new THREE.BoxGeometry(20, 30, 20),
      buildingMaterial2
    );
    building2.position.set(40, 15, 20);
    building2.castShadow = true;
    building2.receiveShadow = true;
    // Create custom bounding box for building collision (not shadows)
    const building2BoundingBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(40, 1, 20), // center at ground level
      new THREE.Vector3(20, 2, 20) // building base dimensions only
    );

    building2.userData = {
      type: "building",
      boundingBox: building2BoundingBox,
    };
    scene.add(building2);
    collisionObjects.push(building2);

    // Building 3
    const building3 = new THREE.Mesh(
      new THREE.BoxGeometry(25, 15, 25),
      buildingMaterial3
    );
    building3.position.set(-40, 7.5, 30);
    building3.castShadow = true;
    building3.receiveShadow = true;
    // Create custom bounding box for building collision (not shadows)
    const building3BoundingBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(-40, 1, 30), // center at ground level
      new THREE.Vector3(25, 2, 25) // building base dimensions only
    );

    building3.userData = {
      type: "building",
      boundingBox: building3BoundingBox,
    };
    scene.add(building3);
    collisionObjects.push(building3);

    // Create trees (moved away from buildings)
    const treePositions = [
      { x: -15, z: 15 }, // moved away from building1
      { x: 30, z: -15 },
      { x: -50, z: -40 },
      { x: 60, z: 40 },
      { x: 15, z: 45 }, // moved away from building3
      { x: -25, z: -5 }, // moved away from building1
    ];

    treePositions.forEach((pos) => {
      const treeGroup = new THREE.Group();

      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8);
      const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 4;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Tree leaves
      const leavesGeometry = new THREE.SphereGeometry(5, 8, 6);
      const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.y = 10;
      leaves.castShadow = true;
      treeGroup.add(leaves);

      treeGroup.position.set(pos.x, 0, pos.z);

      // Create custom bounding box for just the trunk (not the full tree with leaves shadow)
      const trunkBoundingBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(pos.x, 2, pos.z), // center at trunk base
        new THREE.Vector3(3, 4, 3) // smaller collision box around trunk only
      );

      treeGroup.userData = {
        type: "tree",
        boundingBox: trunkBoundingBox,
      };
      scene.add(treeGroup);
      collisionObjects.push(treeGroup);
    });

    // Create interactive objects (collectibles)
    const collectibles = [];
    const collectibleGeometry = new THREE.OctahedronGeometry(1, 0);
    const collectibleMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
    });

    const collectiblePositions = [
      { x: 0, z: -20 },
      { x: 25, z: 0 },
      { x: -25, z: 25 },
      { x: 45, z: -30 },
      { x: -45, z: -30 },
    ];

    collectiblePositions.forEach((pos, index) => {
      const collectible = new THREE.Mesh(
        collectibleGeometry,
        collectibleMaterial
      );
      collectible.position.set(pos.x, 3, pos.z);
      collectible.castShadow = true;
      collectible.userData = { id: index, collected: false };
      collectibles.push(collectible);
      scene.add(collectible);
    });

    // Keyboard controls
    const handleKeyDown = (event) => {
      keysPressed.current[event.key.toLowerCase()] = true;
    };

    const handleKeyUp = (event) => {
      keysPressed.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Update car physics
      const acceleration = 0.5;
      const maxSpeed = 1.0;
      const friction = 0.95;
      const turnSpeed = 0.05;

      if (keysPressed.current["arrowup"] || keysPressed.current["w"]) {
        carVelocity.current.x += Math.sin(carRotation.current) * acceleration;
        carVelocity.current.z += Math.cos(carRotation.current) * acceleration;
      }
      if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) {
        carVelocity.current.x -=
          Math.sin(carRotation.current) * acceleration * 0.5;
        carVelocity.current.z -=
          Math.cos(carRotation.current) * acceleration * 0.5;
      }
      if (keysPressed.current["arrowleft"] || keysPressed.current["a"]) {
        carRotation.current += turnSpeed;
      }
      if (keysPressed.current["arrowright"] || keysPressed.current["d"]) {
        carRotation.current -= turnSpeed;
      }

      // Apply friction
      carVelocity.current.x *= friction;
      carVelocity.current.z *= friction;

      // Limit speed
      const speed = Math.sqrt(
        carVelocity.current.x ** 2 + carVelocity.current.z ** 2
      );
      if (speed > maxSpeed) {
        carVelocity.current.x = (carVelocity.current.x / speed) * maxSpeed;
        carVelocity.current.z = (carVelocity.current.z / speed) * maxSpeed;
      }

      // Update car position with collision detection
      if (carRef.current) {
        const newX = carRef.current.position.x + carVelocity.current.x;
        const newZ = carRef.current.position.z + carVelocity.current.z;

        // Create temporary position for collision testing
        const tempPosition = new THREE.Vector3(
          newX,
          carRef.current.position.y,
          newZ
        );
        const carBoundingBox = new THREE.Box3().setFromCenterAndSize(
          tempPosition,
          new THREE.Vector3(4, 1.5, 2) // Car dimensions
        );

        // Check for collisions
        let collision = false;
        for (const obj of collisionObjects) {
          const objBoundingBox = new THREE.Box3().setFromObject(obj);
          if (carBoundingBox.intersectsBox(objBoundingBox)) {
            collision = true;
            break;
          }
        }

        // Only update position if no collision
        if (!collision) {
          carRef.current.position.x = newX;
          carRef.current.position.z = newZ;
        } else {
          // Stop the car on collision
          carVelocity.current.x *= 0.1;
          carVelocity.current.z *= 0.1;
        }

        carRef.current.rotation.y = carRotation.current + Math.PI / 2; // Base rotation + dynamic rotation

        // Keep car in bounds
        const boundary = 90;
        carRef.current.position.x = Math.max(
          -boundary,
          Math.min(boundary, carRef.current.position.x)
        );
        carRef.current.position.z = Math.max(
          -boundary,
          Math.min(boundary, carRef.current.position.z)
        );
      }

      // Update camera to follow car
      if (cameraRef.current && carRef.current) {
        const cameraOffset = new THREE.Vector3(
          -Math.sin(carRotation.current) * 20,
          10,
          -Math.cos(carRotation.current) * 20
        );
        cameraRef.current.position.lerp(
          carRef.current.position.clone().add(cameraOffset),
          0.1
        );
        cameraRef.current.lookAt(carRef.current.position);
      }

      // Rotate collectibles and check for collection
      collectibles.forEach((collectible, index) => {
        if (!collectible.userData.collected && collectible.parent) {
          collectible.rotation.y += 0.02;
          collectible.position.y =
            3 + Math.sin(Date.now() * 0.001 + index) * 0.5;

          // Check collision with car
          if (carRef.current) {
            const distance = collectible.position.distanceTo(
              carRef.current.position
            );
            if (distance < 4) {
              collectible.userData.collected = true;
              // Add collection effect
              collectible.material.emissiveIntensity = 1;

              // Update score
              setScore((prevScore) => {
                const newScore = prevScore + 1;
                console.log(`Crystal collected! Score: ${newScore}/5`);
                if (newScore === 5) {
                  console.log("All crystals collected! You win!");
                  setGameWon(true);
                  setShowFireworks(true);
                  // Create fireworks
                  setTimeout(() => {
                    createFireworks();
                  }, 100);
                  // Redirect after 5 seconds
                  setTimeout(() => {
                    window.location.href = "/";
                  }, 5000);
                }
                return newScore;
              });

              // Remove after a brief flash
              setTimeout(() => {
                if (collectible.parent) {
                  scene.remove(collectible);
                }
              }, 100);
            }
          }
        }
      });

      // Update fireworks
      if (showFireworks) {
        updateFireworks();
      }

      renderer.render(scene, camera);
    };

    // Fireworks functions
    const createFireworks = () => {
      console.log("Creating fireworks!");
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          const firework = {
            particles: [],
            position: new THREE.Vector3(
              (Math.random() - 0.5) * 60,
              Math.random() * 20 + 10,
              (Math.random() - 0.5) * 60
            ),
            life: 60,
          };

          // Create particles for this firework
          for (let j = 0; j < 20; j++) {
            const particleGeometry = new THREE.SphereGeometry(0.2, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
              color: new THREE.Color().setHSL(Math.random(), 1, 0.7),
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            particle.position.copy(firework.position);
            particle.velocity = new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            );

            scene.add(particle);
            firework.particles.push(particle);
          }

          fireworksRef.current.push(firework);
          console.log(
            `Firework ${i + 1} created with ${
              firework.particles.length
            } particles`
          );
        }, i * 300);
      }
    };

    const updateFireworks = () => {
      if (fireworksRef.current.length > 0) {
        fireworksRef.current.forEach((firework, fireworkIndex) => {
          firework.life--;

          firework.particles.forEach((particle, particleIndex) => {
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.02; // gravity
            particle.material.opacity = firework.life / 60;
          });

          if (firework.life <= 0) {
            firework.particles.forEach((particle) => {
              scene.remove(particle);
            });
            fireworksRef.current.splice(fireworkIndex, 1);
          }
        });
      }
    };

    // Start animation
    setLoading(false);
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "24px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading...
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "15px",
          borderRadius: "10px",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>🚗 Drive Around!</h3>
        <p style={{ margin: "5px 0" }}>Use Arrow Keys or WASD to move</p>
        <p style={{ margin: "5px 0" }}>Collect the golden crystals!</p>
        <p style={{ margin: "5px 0", fontWeight: "bold" }}>Score: {score}/5</p>
      </div>

      {gameWon && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "48px",
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            textShadow: "4px 4px 8px rgba(0,0,0,0.8)",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "30px",
            borderRadius: "20px",
            border: "3px solid gold",
            zIndex: 1000,
            animation: "pulse 1s infinite",
          }}
        >
          🎉 YOU WIN! 🎉
          <div style={{ fontSize: "24px", marginTop: "20px" }}>
            Returning to homepage...
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CarGame;
