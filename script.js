// Game state
const gameState = {
    score: 0,
    treasuresCollected: 0,
    treasures: [
        // We'll fill this with nearby locations
    ]
};

// Debug mode - set to true to show treasures regardless of GPS location
const DEBUG_MODE = true;

// Initialize the game
function initGame() {
    // Get player's location
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Generate treasures around the player
            generateTreasures(userLat, userLng);
            
            // Start watching the player's position to update AR content
            startLocationTracking();
            
            // Show welcome message
            showMessage("Find and collect the AR treasures around you!");
        },
        (error) => {
            showMessage("Error accessing your location. Please enable location services.");
            console.error("Geolocation error:", error);
        }
    );
    
    // Update the UI
    updateScoreUI();
}

// Generate treasure locations around the player
function generateTreasures(centerLat, centerLng) {
    // Clear existing treasures
    gameState.treasures = [];
    
    // Generate 5 treasures within 10 meters of the player (much closer)
    for (let i = 0; i < 5; i++) {
        // Generate a random offset in meters (smaller radius)
        const latOffset = (Math.random() - 0.5) * 0.0002; // Roughly 10m radius
        const lngOffset = (Math.random() - 0.5) * 0.0002;
        
        // Create a treasure object
        const treasure = {
            id: `treasure-${i}`,
            lat: centerLat + latOffset,
            lng: centerLng + lngOffset,
            collected: false,
            points: Math.floor(Math.random() * 10) + 1, // 1-10 points
            model: i % 2 === 0 ? 'chest' : 'coin' // Alternate between models
        };
        
        gameState.treasures.push(treasure);
    }
    
    console.log("Treasures generated:", gameState.treasures);
}

// Start tracking the player's location
function startLocationTracking() {
    // Watch position with high accuracy
    navigator.geolocation.watchPosition(
        updateARContent,
        (error) => console.error("Position tracking error:", error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
}

// Update AR content based on player's position
function updateARContent(position) {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;
    
    // Get the container for our AR content
    const treasuresContainer = document.getElementById('treasures-container');
    
    // Clear existing AR entities
    treasuresContainer.innerHTML = '';
    
    // Loop through all treasures
    gameState.treasures.forEach((treasure, index) => {
        // Skip if already collected
        if (treasure.collected) return;
        
        let x, z;
        
        if (DEBUG_MODE) {
            // In debug mode, place treasures in a circle around the user
            const angle = (index / gameState.treasures.length) * Math.PI * 2;
            x = Math.sin(angle) * 3; // 3 meters away
            z = -Math.cos(angle) * 3;
        } else {
            // Calculate distance between player and treasure
            const distance = calculateDistance(
                userLat, userLng,
                treasure.lat, treasure.lng
            );
            
            // Only show treasures within 100 meters
            if (distance <= 100) {
                // Calculate direction to place the AR object
                const angle = calculateAngle(
                    userLat, userLng,
                    treasure.lat, treasure.lng
                );
                
                // Convert GPS difference to local coordinates
                x = Math.sin(angle) * distance;
                z = -Math.cos(angle) * distance;
            } else {
                // Skip treasures that are too far away
                return;
            }
        }
        
        // Create AR entity
        const entity = document.createElement('a-entity');
        entity.setAttribute('id', treasure.id);
        
        // Position the entity relative to the user
        entity.setAttribute('position', `${x} 0 ${z}`);
        
        // Add visual based on model type
        if (treasure.model === 'chest') {
            entity.innerHTML = `
                <a-box color="brown" width="1" height="0.7" depth="0.7"></a-box>
                <a-box color="gold" width="1" height="0.1" depth="0.7" position="0 0.4 0"></a-box>
            `;
        } else {
            entity.innerHTML = `
                <a-cylinder color="gold" radius="0.5" height="0.1" rotation="90 0 0"></a-cylinder>
            `;
        }
        
        // Make it clickable
        entity.setAttribute('class', 'clickable');
        entity.setAttribute('cursor-listener', '');
        
        // Add event listener for collecting treasure
        entity.addEventListener('click', () => collectTreasure(treasure));
     
// ADD THE CODE RIGHT HERE - after click event listener, before adding to scene
// If we're in debug mode, add directional arrows to all treasures
// If not in debug mode, only add arrows to treasures more than 10m away
if (DEBUG_MODE || (!DEBUG_MODE && calculateDistance(userLat, userLng, treasure.lat, treasure.lng) > 10)) {
    // Add directional arrow
    const arrow = document.createElement('a-entity');
    arrow.innerHTML = `
        <a-cone color="red" height="0.5" radius-bottom="0.2" radius-top="0" position="0 1 0"></a-cone>
    `;
    entity.appendChild(arrow);
}
        
        // Add to scene
        treasuresContainer.appendChild(entity);
    });
}

// Calculate distance between two GPS coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Calculate angle between two GPS coordinates
function calculateAngle(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return Math.atan2(y, x);
}

// Handle treasure collection
function collectTreasure(treasure) {
    // Mark as collected
    treasure.collected = true;
    
    // Update score
    gameState.score += treasure.points;
    gameState.treasuresCollected++;
    
    // Update UI
    updateScoreUI();
    
    // Show message
    showMessage(`You found a treasure! +${treasure.points} points`);
    
    // Remove the AR entity
    const entity = document.getElementById(treasure.id);
    if (entity) {
        entity.parentNode.removeChild(entity);
    }
    
    // Check if all treasures are collected
    if (gameState.treasuresCollected === gameState.treasures.length) {
        setTimeout(() => {
            showMessage(`Congratulations! You found all treasures! Final score: ${gameState.score}`);
        }, 2000);
    }
}

// Update the score display
function updateScoreUI() {
    document.getElementById('score').textContent = gameState.score;
}

// Show a temporary message to the player
function showMessage(text, duration = 3000) {
    const messageContainer = document.getElementById('message-container');
    messageContainer.textContent = text;
    messageContainer.style.display = 'block';
    
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, duration);
}

// Initialize the game when loaded
window.addEventListener('load', initGame);

// Add a custom component for click detection
AFRAME.registerComponent('cursor-listener', {
    init: function () {
        this.el.addEventListener('click', function (evt) {
            // This is handled by the click event we added to the entity
        });
    }
});
