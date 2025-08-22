
document.getElementById('downloadPDFBtn').addEventListener('click', () => {
    fetch('http://localhost:3000/api/download-pdf')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test-history.pdf'; // Default filename
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF.');
        });
});

// Game loading variables
let currentLoadingGame = null;
let loadingTimeout = null;
let eventSource = null;

// Enhanced EventSource handler to include loading events
function initializeEventSource() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource('http://localhost:3000/api/events');
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'test-update') {
            if (data.data && data.data.stats) updateStats(data.data.stats);
            if (data.data && data.data.gameStatus) {
                // Only update table, not sidebar list
                updateGameTable(data.data.gameStatus);
            }
        } else if (data.type === 'game-loading') {
            handleGameLoading(data.data);
        }
    };

    eventSource.onerror = function(event) {
        console.error('EventSource failed:', event);
        // Reconnect after 5 seconds
        setTimeout(() => {
            initializeEventSource();
        }, 5000);
    };
}

// Handle game loading updates
function handleGameLoading(loadingData) {
    const { testId, gameId, progress, status, gameName, gameImage, provider } = loadingData;
    
    // Show loading section if not visible
    const loadingSection = document.getElementById('gameLoadingSection');
    const gameNameEl = document.getElementById('gameName');
    const gameImageEl = document.getElementById('gameImage');
    const loaderBar = document.getElementById('loaderBar');
    const loaderPercentage = document.getElementById('loaderPercentage');
    
    if (!loadingSection || !gameNameEl || !loaderBar || !loaderPercentage) {
        console.error('Loading elements not found in DOM');
        return;
    }
    
    // Update current loading game
    currentLoadingGame = {
        testId,
        gameId,
        gameName,
        gameImage,
        provider
    };
    
    // Show loading section
    loadingSection.classList.remove('hidden');
    
    // Update game information
    gameNameEl.textContent = gameName || 'Loading Game...';
    
    // Update game image
    if (gameImage && gameImage.trim() !== '') {
        gameImageEl.src = gameImage;
        gameImageEl.alt = gameName || 'Game Image';
        gameImageEl.classList.remove('hidden');
        gameImageEl.style.maxWidth = '80px';
        gameImageEl.style.maxHeight = '80px';
        gameImageEl.style.borderRadius = '8px';
    } else {
        gameImageEl.classList.add('hidden');
    }
    
    // Update progress bar
    const progressPercent = Math.min(100, Math.max(0, progress));
    loaderBar.style.width = `${progressPercent}%`;
    loaderPercentage.textContent = `${progressPercent}%`;
    
    // Update status text
    if (status && typeof status === 'string') {
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        gameNameEl.textContent = `${gameName || 'Game'} - ${statusText}`;
    }
    
    // Clear any existing timeout
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
    }
    
    // Check if loading is complete
    if (progress >= 100) {
        // Wait 2 seconds then hide loading and refresh
        loadingTimeout = setTimeout(() => {
            hideGameLoading();
            // Auto-refresh table data only
            refreshTableOnly();
        }, 2000);
    } else {
        // Set a safety timeout to hide loading after 60 seconds
        loadingTimeout = setTimeout(() => {
            hideGameLoading();
        }, 60000);
    }
}

// Hide game loading section
function hideGameLoading() {
    const loadingSection = document.getElementById('gameLoadingSection');
    if (loadingSection) {
        loadingSection.classList.add('hidden');
    }
    
    currentLoadingGame = null;
    
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
}

// Only refresh table data, not stats or filters
function refreshTableOnly() {
    fetch('http://localhost:3000/api/game-stats')
        .then(response => response.json())
        .then(data => {
            if (data && data.gameStatus) {
                updateGameTable(data.gameStatus);
            }
        })
        .catch(error => {
            console.error('Error refreshing table:', error);
        });
}

// Enhanced refresh button functionality: refreshes only the table
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Add loading animation to refresh button
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
            refreshBtn.disabled = true;
            
            // Fetch latest table data only
            refreshTableOnly();
            setTimeout(() => {
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
            }, 1000);
        });
    }
});

// Remove games list rendering (sidebar)
function updateGamesList(games) {
    // Do nothing: no sidebar list
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEventSource();
    refreshTableOnly();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (eventSource) {
        eventSource.close();
    }
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
    }
});

const resetBtn = document.getElementById('resetServerBtn');
const confirmModal = document.getElementById('confirmModal');
const cancelBtn = document.getElementById('cancelReset');
const confirmBtn = document.getElementById('confirmReset');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const resetSpinner = document.getElementById('resetSpinner');

// Show confirmation modal
resetBtn.addEventListener('click', () => {
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');
});

// Hide confirmation modal
cancelBtn.addEventListener('click', hideModal);
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) hideModal();
});

function hideModal() {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
}

// Handle server reset
confirmBtn.addEventListener('click', async () => {
    hideModal();
    
    // Show loading state
    resetBtn.disabled = true;
    resetSpinner.classList.remove('hidden');
    resetBtn.querySelector('span').textContent = 'Resetting...';
    
    try {
        const response = await fetch('http://localhost:3000/api/reset-server', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (response.ok) {
            showStatus('success', result.message || 'Server reset successfully!');
            
            // Optional: Reload page after successful reset
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showStatus('error', result.error || 'Failed to reset server');
        }
    } catch (error) {
        console.error('Reset error:', error);
        showStatus('error', 'Network error occurred while resetting server');
    } finally {
        // Reset button state
        resetBtn.disabled = false;
        resetSpinner.classList.add('hidden');
        resetBtn.querySelector('span').textContent = 'Reset Server';
    }
});

function showStatus(type, message) {
    statusMessage.className = `mt-4 p-3 rounded-lg ${
        type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
    }`;
    statusText.textContent = message;
    statusMessage.classList.remove('hidden');

    // Hide after 5 seconds
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideModal();
    }
});


// Handle file input
function handleFileInput(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('processFileBtn').classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Process uploaded file
function processFile() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showErrorNotification('Please select a file first.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            processExcelData(jsonData);
        } catch (error) {
            console.error('Error processing file:', error);
            showErrorNotification('Failed to process the file. Make sure it\'s a valid Excel file.');
        }
    };
    
    reader.onerror = function() {
        showErrorNotification('Error reading the file.');
    };
    
    reader.readAsArrayBuffer(file);
}

// Apply filters to the game data
function applyFilters() {
    const nameFilter = document.getElementById('gameNameFilter').value.toLowerCase();
    const providerFilter = document.getElementById('providerFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredData = gameData.filter(game => {
        const gameName = (game.displayName || game.name || extractNameFromUrl(game.id) || '').toLowerCase();
        const provider = (game.providerName || game.provider || 'Unknown').toLowerCase();
        const category = (game.category || 'General').toLowerCase();
        let status = '';
        
        if (game.gameStatus === true) {
            status = 'success';
        } else if (game.gameStatus === false) {
            status = 'failed';
        } else if (game.gameStatus === 'testing' || game.gameStatus === 'in-progress') {
            status = 'pending';
        } else {
            status = game.published ? 'success' : 'pending';
        }
        
        return (
            gameName.includes(nameFilter) && 
            (providerFilter === '' || provider === providerFilter.toLowerCase()) &&
            (categoryFilter === '' || category === categoryFilter.toLowerCase()) &&
            (statusFilter === '' || status === statusFilter)
        );
    });
    
    renderGameTable(filteredData);
    updateFilterDropdowns();
}

// Refresh dashboard
function refreshDashboard() {
    fetchGameStats();
    showSuccessNotification('Dashboard refreshed.');
}

// Update statistics
function updateStats() {
    let successCount = 0;
    let failCount = 0;
    let pendingCount = 0;
    
    gameData.forEach(game => {
        if (game.gameStatus === true || game.published) {
            successCount++;
        } else if (game.gameStatus === false) {
            failCount++;
        } else {
            pendingCount++;
        }
    });
    
    document.getElementById('totalGames').textContent = gameData.length;
    document.getElementById('launchedGames').textContent = successCount;
    document.getElementById('failedGames').textContent = failCount;
    document.getElementById('pendingGames').textContent = pendingCount;
}

// Populate filter options
function populateFilterOptions() {
    // Get unique providers using the same property as the table
    const providers = [...new Set(gameData.map(game => 
        game.providerName || 'Unknown'
    ))];
    
    // Get unique categories
    const categories = [...new Set(gameData.map(game => 
        game.category || 'General'
    ))];
    
    // Update provider dropdown
    const providerFilter = document.getElementById('providerFilter');
    providerFilter.innerHTML = '<option value="">All Providers</option>';
    
    providers.sort().forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.toLowerCase();
        option.textContent = provider;
        providerFilter.appendChild(option);
    });
    
    // Update category dropdown
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category.toLowerCase();
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize file input handler
    document.getElementById('excelFile').addEventListener('change', handleFileInput);
    
    // Make sure we're setting up all the event handlers correctly
    if (!window.processFile) {
        window.processFile = processFile;
    }
    
    if (!window.handleFileInput) {
        window.handleFileInput = handleFileInput;
    }
});

let gameData = [];
let filteredData = [];
let evtSource = null;

// Initialize event source for real-time updates
function initEventSource() {
if (evtSource !== null) {
evtSource.close();
}

evtSource = new EventSource('http://localhost:3000/api/events');

evtSource.onmessage = function(event) {
try {
    const data = JSON.parse(event.data);
    updateDashboardStats(data.stats);
    
    // Merge backend test results with our local game data
    data.gameStatus.forEach(backendGame => {
        const localGame = gameData.find(g => g.id === backendGame.id);
        if (localGame) {
            // Update local game with backend test results
            localGame.gameStatus = backendGame.gameStatus;
            localGame.error = backendGame.error;
            localGame.errorCategory = backendGame.errorCategory;
            localGame.endTime = backendGame.endTime;
            localGame.duration = backendGame.duration;
            localGame.testId = backendGame.testId;
            
            // Update screenshots if available
            if (backendGame.successScreenshot) {
                localGame.successScreenshot = backendGame.successScreenshot;
            }
            if (backendGame.errorScreenshot) {
                localGame.errorScreenshot = backendGame.errorScreenshot;
            }
            if (backendGame.initialScreenshot) {
                localGame.initialScreenshot = backendGame.initialScreenshot;
            }
            if (backendGame.iframeScreenshot) {
                localGame.iframeScreenshot = backendGame.iframeScreenshot;
            }
        } else {
            // Add new game from backend
            gameData.push(backendGame);
        }
    });
    
    renderGameTable(filteredData);
} catch (error) {
    console.error('Error processing SSE update:', error);
}
};

evtSource.onerror = function() {
console.log('SSE connection error, reconnecting in 5 seconds...');
evtSource.close();
setTimeout(initEventSource, 5000);
};
}

// Fetch game statistics
function fetchGameStats() {
console.log('Attempting to fetch game stats from server...');
fetch('http://localhost:3000/api/game-stats')
.then(response => {
    console.log('Received response:', response);
    return response.json();
})
.then(data => {
    console.log('Successfully parsed game stats data:', data);
    updateDashboardStats(data.stats);
    updateGameTable(data.gameStatus);
    initEventSource();
})
.catch(error => {
    console.error('Error fetching game stats:', error);
    showErrorNotification('Failed to fetch game statistics. Please refresh the page or check if the server is running at http://localhost:3000');
});
}

// Update dashboard statistics
function updateDashboardStats(stats) {
document.getElementById('totalGames').textContent = (stats.successCount + stats.failCount + stats.pendingCount) || 0;
document.getElementById('launchedGames').textContent = stats.successCount || 0;
document.getElementById('failedGames').textContent = stats.failCount || 0;
document.getElementById('pendingGames').textContent = stats.pendingCount || 0;
}

// Update game table with the latest data
function updateGameTable(games) {
gameData = games || [];
applyFilters();
}

// Process Excel file data
function processExcelData(data) {
const gamesData = data.map((item, index) => {
const published = !!item['Published On'];

return {
    id: item['Name'] || `Game${index + 1}`,
    name: item['Name'] || '',
    displayName: item['displayName'] || item['Name'] || '',
    catalogueName: item['catalogueName'] || item['Name'] || '',
    image: item['image'] || '',
    catalogueGameId: item['catalogueGameId'] || '',
    category: item['category'] || 'General',
    providerName: item['providerName'] || 'Unknown',
    provider: item['providerName'] || 'Unknown',
    popularity: item['popularity'] || 0,
    tableId: item['tableId'] || '',
    featured: item['featured'] || false,
    published: published,
    reason: published ? 'Game launched successfully' : 'Not launched',
    gameStatus: published
};
});

filteredData = [...gamesData];
updateStats();
populateFilterOptions();
renderGameTable(filteredData);

showSuccessNotification(`Successfully processed ${gamesData.length} games from the Excel file.`);

// Process games one by one with delay
let i = 0;
function processNextGame() {
if (i < gamesData.length) {
    let game = gamesData[i];

    if (game.catalogueGameId) {
        sendGameToBackend(game);
    }

    setTimeout(() => {
        i++;
        processNextGame();
    }, 30000); // 60 seconds delay between each game
}
}

processNextGame();
}

// Send game to backend for testing
function sendGameToBackend(game) {
fetch('http://localhost:3000/api/game-catalogue', {
method: 'POST',
headers: {
    'Content-Type': 'application/json'
},
body: JSON.stringify({ 
    catalogueGameId: game.catalogueGameId, 
    priority: 1,
    game: {
        providerName: game.providerName,
        displayName: game.displayName,
        name: game.name,
        category: game.category,
        image: game.image
    }
})
})
.then(response => response.json())
.then(data => {
console.log('Game test initiated:', data);
showSuccessNotification(`Testing ${game.displayName || game.name}`);

// Update local game with test ID if available
if (data.gameInfo) {
    const localGame = gameData.find(g => g.id === game.catalogueGameId);
    if (localGame) {
        localGame.testId = data.testId;
    }
}
})
.catch(error => {
console.error('Error sending game to backend:', error);
showErrorNotification('Failed to start game test');
});
}

// Preview game in modal with screenshots
function previewGame(gameId) {
// Find the game in our data
const game = [...gameData, ...(window.backendGameStatus || [])].find(g => g.id === gameId);

if (!game) {
showErrorNotification('Game details not found.');
return;
}

// Update modal content
const modal = document.getElementById('gamePreviewModal');
modal.querySelector('#previewGameTitle').textContent = 
game.displayName || game.name || extractNameFromUrl(game.id) || 'Unknown Game';
modal.querySelector('#previewGameProvider').textContent = 
game.provider || 'Unknown';
modal.querySelector('#previewGameCategory').textContent = 
game.category || 'General';

// Determine status text
let statusText = 'Unknown';
if (game.gameStatus === true) {
statusText = 'Launch Successful';
} else if (game.gameStatus === false) {
statusText = 'Launch Failed';
} else if (game.gameStatus === 'testing') {
statusText = 'In Progress';
} else if (game.gameStatus === 'in-progress') {
statusText = 'In Queue';
} else {
statusText = game.published ? 'Published' : 'Not Published';
}
modal.querySelector('#previewGameStatus').textContent = statusText;

// Hide iframe initially
const iframe = modal.querySelector('#gameIframe');
iframe.style.display = 'none';

// Show screenshot if available
const screenshotContainer = modal.querySelector('#gameScreenshotContainer');
const screenshotImg = modal.querySelector('#gameScreenshot');

if (game.successScreenshot) {
// Show the success screenshot
screenshotImg.src = game.successScreenshot;
screenshotContainer.style.display = 'block';
}else if(game.errorScreenshot){
    screenshotImg.src = game.errorScreenshot;
    screenshotContainer.style.display = 'block';
} 
else {
// No screenshot available
screenshotContainer.style.display = 'none';

// // If no screenshot but we have a URL, show the iframe
if (game.errorScreenshot) {
    screenshotImg.src = game.errorScreenshot;
    screenshotContainer.style.display = 'block';
    iframe.style.display = 'none';

} else {
    // Show fallback image for "not iframe" error
    screenshotImg.src = 'no-iframe-found.png';
    screenshotContainer.style.display = 'block';
    iframe.style.display = 'none';
}
}

// Show modal
modal.classList.add('active');

// If this game hasn't been tested yet, add it to the queue
if (!game.gameStatus && game.id && (game.id.startsWith('http://') || game.id.startsWith('https://'))) {
sendGameToBackend(game);
}
}

// Hide game preview modal
function hideGamePreviewModal() {
const modal = document.getElementById('gamePreviewModal');
modal.classList.remove('active');
modal.querySelector('#gameIframe').src = 'about:blank';
modal.querySelector('#gameScreenshot').src = '';
}

// Render game table with real-time updates and scrollable content
function renderGameTable(games) {
const tableBody = document.getElementById('gamesTableBody');
tableBody.innerHTML = '';

if (!games || games.length === 0) {
tableBody.innerHTML = `<tr>
    <td colspan="6" class="px-6 py-4 text-sm text-gray-500 text-center">
        <div class="flex flex-col items-center py-4">
            <i class="fas fa-gamepad text-3xl text-blue-900 mb-2"></i>
            <p class="text-blue-900">No games loaded. Upload an Excel file to get started.</p>
        </div>
    </td>
</tr>`;
return;
}

games.forEach((game, index) => {
const row = document.createElement('tr');

// Determine status
let statusClass, statusText;
if (game.gameStatus === true) {
    statusClass = 'bg-green-100 text-green-800';
    statusText = 'Launch-Successful';
} else if (game.gameStatus === false) {
    statusClass = 'bg-red-100 text-red-800';
    statusText = 'Launch-Failed';
} else if (game.gameStatus === 'testing') {
    statusClass = 'bg-yellow-100 text-yellow-800';
    statusText = 'In Progress';
} else if (game.gameStatus === 'in-progress') {
    statusClass = 'bg-yellow-100 text-yellow-800';
    statusText = 'In Queue';
} else {
    statusClass = game.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    statusText = game.published ? 'Published' : 'Not Published';
}

const provider = game.provider || 'Unknown';
const displayName = game.displayName || game.name || extractNameFromUrl(game.id) || 'Unknown Game';
const category = game.category || 'General';
const imageUrl = game.imageUrl || '';

row.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${index + 1}</td>
    <td class="px-6 py-4 whitespace-nowrap text-center">
    <img src="${imageUrl}" alt="${displayName}" class="game-image mx-auto">
    </td>
    <td class="px-6 py-4 whitespace-nowrap truncate text-center">
    <a href="#" class="text-blue-600 hover:text-blue-900" onclick="previewGame('${game.id}'); return false;">
        ${displayName}
    </a>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${provider}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${category}</td>
    <td class="px-6 py-4 whitespace-nowrap text-center">
    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
        ${statusText}
    </span>
    ${game.error ? 
        `<button class="ml-2 p-1 rounded-full text-red-600 hover:bg-red-100" onclick="showErrorModal('${game.id}', '${displayName}'); return false;">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        </button>` 
    : ''}
    </td>
`;

tableBody.appendChild(row);
});

// Ensure the table body is scrollable with overflow hidden
const tableContainer = document.querySelector('.overflow-x-auto');
tableContainer.style.overflowY = 'auto';
tableContainer.style.maxHeight = '490px'; 
}


// Helper functions
// function extractProviderFromUrl(url) {
// if (!url) return 'Unknown';
// try {
// const domain = new URL(url).hostname;
// if (domain.includes('playngo')) return 'Play n Go';
// if (domain.includes('netent')) return 'NetEnt';
// if (domain.includes('pragmatic')) return 'Pragmatic Play';
// if (domain.includes('microgaming')) return 'Microgaming';
// if (domain.includes('evo')) return 'Evolution Gaming';
// return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
// } catch {
// return 'Unknown';
// }
// }

function extractNameFromUrl(url) {
if (!url) return 'Unknown Game';
try {
const path = new URL(url).pathname;
const parts = path.split('/').filter(p => p);
if (parts.length > 0) {
    return parts[parts.length - 1]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
return 'Unknown Game';
} catch {
return 'Unknown Game';
}
}

// Show error details modal
function showErrorModal(gameId, gameName) {
// Find the game in data
const game = gameData.find(g => g.id === gameId);

if (!game) {
showErrorNotification('Error details not found.');
return;
}

// Create modal if it doesn't exist
let errorModal = document.getElementById('errorModal');
if (!errorModal) {
errorModal = document.createElement('div');
errorModal.id = 'errorModal';
errorModal.className = 'modal';

errorModal.innerHTML = `
    <div class="modal-content max-w-2xl">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 class="text-xl font-semibold text-gray-800">Error Details</h3>
            <button class="text-gray-500 hover:text-gray-700" onclick="document.getElementById('errorModal').classList.remove('active')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div class="p-6">
            <div class="mb-6">
                <h4 id="errorGameName" class="text-lg font-medium text-gray-800 mb-4"></h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-500">Error Type</p>
                        <p id="errorCategory" class="text-base text-gray-800"></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Time</p>
                        <p id="errorTime" class="text-base text-gray-800"></p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Duration</p>
                        <p id="errorDuration" class="text-base text-gray-800"></p>
                    </div>
                </div>
                <div class="mb-4">
                    <p class="text-sm text-gray-500">Error Message</p>
                    <p id="errorMessage" class="text-base text-gray-800 p-3 bg-red-50 border border-red-100 rounded mt-1"></p>
                </div>
            </div>
        
        </div>
        <div class="p-6 border-t border-gray-200 flex justify-end gap-3">
           
            <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50" onclick="document.getElementById('errorModal').classList.remove('active')">
                Close
            </button>
        </div>
    </div>
`;

document.body.appendChild(errorModal);

// Add event listener for retry button
document.getElementById('retryGameBtn').addEventListener('click', function() {
    const gameId = this.getAttribute('data-game-id');
    
    fetch(' http://localhost:3000/api/game-catalogue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ catalogueGameId: gameId, priority: 3 })
    })
    .then(response => response.json())
    .then(data => {
        showSuccessNotification(`Retrying test for ${document.getElementById('errorGameName').textContent}`);
        document.getElementById('errorModal').classList.remove('active');
    })
    .catch(error => {
        console.error('Error retrying game test:', error);
        showErrorNotification('Failed to retry game test.');
    });
});
}

// Update modal content
document.getElementById('errorGameName').textContent = gameName;
document.getElementById('errorCategory').textContent = game.errorCategory || 'Unknown Error';
document.getElementById('errorMessage').textContent = game.error || errorMessage || 'No error message available';
document.getElementById('errorTime').textContent = game.endTime ? new Date(game.endTime).toLocaleString() : 'Unknown';
document.getElementById('errorDuration').textContent = game.duration ? `${(game.duration / 1000).toFixed(2)} seconds` : 'Unknown';

// // Set retry button data
// document.getElementById('retryGameBtn').setAttribute('data-game-id', gameId);

// Handle screenshot
const errorScreenshotContainer = document.getElementById('errorScreenshotContainer');
const errorScreenshot = document.getElementById('errorScreenshot');

if (errorScreenshotContainer && errorScreenshot) {
    if (game.errorScreenshot) {
        errorScreenshot.src = game.errorScreenshot;
        errorScreenshotContainer.style.display = 'block';
    } else {
        errorScreenshotContainer.style.display = 'none';
    }
}

// Show modal
errorModal.classList.add('active');
}

// Show success notification
function showSuccessNotification(message) {
showNotification(message, 'success');
}

// Show error notification
function showErrorNotification(message) {
showNotification(message, 'error');
}

// Generic notification function
function showNotification(message, type) {
// Create notification container if it doesn't exist
let notificationContainer = document.getElementById('notificationContainer');
if (!notificationContainer) {
notificationContainer = document.createElement('div');
notificationContainer.id = 'notificationContainer';
notificationContainer.style.position = 'fixed';
notificationContainer.style.top = '20px';
notificationContainer.style.right = '20px';
notificationContainer.style.zIndex = '9999';
notificationContainer.style.display = 'flex';
notificationContainer.style.flexDirection = 'column';
notificationContainer.style.gap = '10px';
document.body.appendChild(notificationContainer);
}

// Create notification element
const notification = document.createElement('div');
notification.className = 'rounded-lg shadow-md flex justify-between items-center min-w-64 transition-opacity duration-300';

// Set styles based on notification type
if (type === 'success') {
notification.className += ' bg-green-500 text-white';
} else if (type === 'error') {
notification.className += ' bg-red-500 text-white';
} else {
notification.className += ' bg-blue-500 text-white';
}

// Add message and close button
notification.innerHTML = `
<div class="px-4 py-3">${message}</div>
<button class="px-3 py-3 bg-transparent border-none text-white cursor-pointer hover:text-gray-200">×</button>
`;

// Add close button functionality
notification.querySelector('button').addEventListener('click', function() {
notification.style.opacity = '0';
setTimeout(() => {
    notification.remove();
}, 300);
});

// Add notification to container
notificationContainer.appendChild(notification);

// Auto remove after 5 seconds
setTimeout(() => {
if (notification.parentNode) {
    notification.style.opacity = '0';
    setTimeout(() => {
        notification.remove();
    }, 300);
}
}, 5000);
}

// Update filter dropdowns with available options
function updateFilterDropdowns() {
// Get unique providers using providerName for consistency
const providers = [...new Set(gameData.map(game =>
game.provider || 'Unknown'
))];

// Get unique categories
const categories = [...new Set(gameData.map(game =>
game.category || 'General'
))];

// Update provider dropdown
const providerFilter = document.getElementById('providerFilter');
const currentProviderValue = providerFilter.value;
providerFilter.innerHTML = '<option value="">All Providers</option>';

// Use providerName or provider, fallback to 'Unknown'
const uniqueProviders = [...new Set(gameData.map(game =>
game.providerName || game.provider || 'Unknown'
))];

uniqueProviders.sort().forEach(provider => {
const option = document.createElement('option');
option.value = provider.toLowerCase(); // Set value to lowercase for filtering
option.textContent = provider;
providerFilter.appendChild(option);
});

providerFilter.value = currentProviderValue;

// Update category dropdown
const categoryFilter = document.getElementById('categoryFilter');
const currentCategoryValue = categoryFilter.value;
categoryFilter.innerHTML = '<option value="">All Categories</option>';

categories.sort().forEach(category => {
const option = document.createElement('option');
option.value = category.toLowerCase();
option.textContent = category;
categoryFilter.appendChild(option);
});

categoryFilter.value = currentCategoryValue;
}

// Update statistics
function updateStats() {
let successCount = 0;
let failCount = 0;
let pendingCount = 0;

gameData.forEach(game => {
if (game.gameStatus === true || game.published) {
    successCount++;
} else if (game.gameStatus === false) {
    failCount++;
} else {
    pendingCount++;
}
});

document.getElementById('totalGames').textContent = gameData.length;
document.getElementById('launchedGames').textContent = successCount;
document.getElementById('failedGames').textContent = failCount;
document.getElementById('pendingGames').textContent = pendingCount;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
console.log('DOM fully loaded, initializing application...');
fetchGameStats();

// Set up event listeners
document.getElementById('excelFile').addEventListener('change', handleFileInput);
document.getElementById('processFileBtn').addEventListener('click', processFile);
document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
document.getElementById('gameNameFilter').addEventListener('input', applyFilters);
document.getElementById('providerFilter').addEventListener('change', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('applyFilters').addEventListener('click', applyFilters);

// Close modal when clicking outside
document.getElementById('gamePreviewModal').addEventListener('click', function(e) {
if (e.target === this) {
    hideGamePreviewModal();
}
});
});

// Control Panel JavaScript
class ControlPanel {
constructor() {
this.lastUpdated = new Date();
this.serverStatus = 'online';
this.init();
}

init() {
this.setupEventListeners();
this.updateLastUpdatedTime();
this.startPeriodicUpdates();
}

setupEventListeners() {
const resetBtn = document.getElementById('resetServerBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => this.handleResetServer());
}
}

updateLastUpdatedTime() {
const lastUpdatedElement = document.getElementById('lastUpdated');
if (lastUpdatedElement) {
    const now = new Date();
    const timeDiff = Math.floor((now - this.lastUpdated) / 1000);
    
    let timeText;
    if (timeDiff < 60) {
        timeText = timeDiff === 0 ? 'Just now' : `${timeDiff}s ago`;
    } else if (timeDiff < 3600) {
        timeText = `${Math.floor(timeDiff / 60)}m ago`;
    } else {
        timeText = `${Math.floor(timeDiff / 3600)}h ago`;
    }
    
    lastUpdatedElement.textContent = timeText;
}
}

startPeriodicUpdates() {
// Update the "Last Updated" time every 30 seconds
setInterval(() => {
    this.updateLastUpdatedTime();
}, 30000);

// Check server status every minute
setInterval(() => {
    this.checkServerStatus();
}, 60000);
}

async checkServerStatus() {
try {
    const response = await fetch('http://localhost:3000/api/server-status');
    const data = await response.json();
    this.updateServerStatus(data.status || 'online');
} catch (error) {
    console.warn('Server status check failed:', error);
    this.updateServerStatus('offline');
}
}

updateServerStatus(status) {
this.serverStatus = status;
const serverStatusElement = document.querySelector('.bg-green-50');
const statusIcon = serverStatusElement?.querySelector('i');
const statusText = serverStatusElement?.querySelector('p');

if (serverStatusElement && statusIcon && statusText) {
    // Reset classes
    serverStatusElement.className = serverStatusElement.className.replace(/bg-(green|red|yellow)-50/, '');
    serverStatusElement.className = serverStatusElement.className.replace(/border-(green|red|yellow)-200/, '');
    
    const iconContainer = statusIcon.parentElement;
    iconContainer.className = iconContainer.className.replace(/bg-(green|red|yellow)-100/, '');
    statusIcon.className = statusIcon.className.replace(/text-(green|red|yellow)-600/, '');
    statusText.className = statusText.className.replace(/text-(green|red|yellow)-900/, '');

    switch (status) {
        case 'online':
            serverStatusElement.classList.add('bg-green-50', 'border-green-200');
            iconContainer.classList.add('bg-green-100');
            statusIcon.classList.add('text-green-600');
            statusText.classList.add('text-green-900');
            statusText.textContent = 'Online';
            break;
        case 'offline':
            serverStatusElement.classList.add('bg-red-50', 'border-red-200');
            iconContainer.classList.add('bg-red-100');
            statusIcon.classList.add('text-red-600');
            statusText.classList.add('text-red-900');
            statusText.textContent = 'Offline';
            break;
        case 'maintenance':
            serverStatusElement.classList.add('bg-yellow-50', 'border-yellow-200');
            iconContainer.classList.add('bg-yellow-100');
            statusIcon.classList.add('text-yellow-600');
            statusText.classList.add('text-yellow-900');
            statusText.textContent = 'Maintenance';
            break;
    }
}
}

async handleResetServer() {
const resetBtn = document.getElementById('resetServerBtn');
const resetSpinner = document.getElementById('resetSpinner');
const resetText = resetBtn?.querySelector('span');

if (!resetBtn) return;

// Show the confirmation modal instead of resetting immediately
const confirmModal = document.getElementById('confirmModal');
if (confirmModal) {
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');

    // Handler for confirm button
    const confirmBtn = document.getElementById('confirmReset');
    const cancelBtn = document.getElementById('cancelReset');

    // Remove any previous listeners to avoid stacking
    confirmBtn.onclick = async () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');

        // Proceed with server reset after confirmation
        // (the rest of the reset logic continues here)
        try {
            // Disable button and show loading state
            resetBtn.disabled = true;
            resetSpinner?.classList.remove('hidden');
            if (resetText) resetText.textContent = 'Resetting...';

            // Call the reset endpoint
            const response = await fetch('http://localhost:3000/api/reset-server', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showStatusMessage('success', result.message || 'Server reset successfully');
                this.lastUpdated = new Date();
                this.updateLastUpdatedTime();

                // Trigger a page refresh after a short delay to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                this.showStatusMessage('error', result.error || 'Failed to reset server');
            }
        } catch (error) {
            console.error('Reset server error:', error);
            this.showStatusMessage('error', 'Network error occurred while resetting server');
        } finally {
            // Reset button state
            resetBtn.disabled = false;
            resetSpinner?.classList.add('hidden');
            if (resetText) resetText.textContent = 'Reset Server';
        }
    };

    // Handler for cancel button
    cancelBtn.onclick = () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
    };

    // Also close modal if clicking outside modal content
    confirmModal.onclick = (e) => {
        if (e.target === confirmModal) {
            confirmModal.classList.add('hidden');
            confirmModal.classList.remove('flex');
        }
    };
}

return;

try {
    // Disable button and show loading state
    resetBtn.disabled = true;
    resetSpinner?.classList.remove('hidden');
    if (resetText) resetText.textContent = 'Resetting...';

    // Call the reset endpoint
    const response = await fetch('http://localhost:3000/api/reset-server', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();

    if (response.ok) {
        this.showStatusMessage('success', result.message || 'Server reset successfully');
        this.lastUpdated = new Date();
        this.updateLastUpdatedTime();
        
        // Trigger a page refresh after a short delay to reflect changes
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        this.showStatusMessage('error', result.error || 'Failed to reset server');
    }
} catch (error) {
    console.error('Reset server error:', error);
    this.showStatusMessage('error', 'Network error occurred while resetting server');
} finally {
    // Reset button state
    resetBtn.disabled = false;
    resetSpinner?.classList.add('hidden');
    if (resetText) resetText.textContent = 'Reset Server';
}
}

showStatusMessage(type, message) {
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');

if (!statusMessage || !statusText) return;

// Clear existing classes
statusMessage.className = 'mt-4 p-3 rounded-lg';

// Add appropriate styling based on type
switch (type) {
    case 'success':
        statusMessage.classList.add('bg-green-50', 'border', 'border-green-200', 'text-green-800');
        break;
    case 'error':
        statusMessage.classList.add('bg-red-50', 'border', 'border-red-200', 'text-red-800');
        break;
    case 'warning':
        statusMessage.classList.add('bg-yellow-50', 'border', 'border-yellow-200', 'text-yellow-800');
        break;
    default:
        statusMessage.classList.add('bg-blue-50', 'border', 'border-blue-200', 'text-blue-800');
}

statusText.textContent = message;
statusMessage.classList.remove('hidden');

// Auto-hide after 5 seconds
setTimeout(() => {
    statusMessage.classList.add('hidden');
}, 5000);
}
}

// Initialize the control panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
window.controlPanel = new ControlPanel();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
module.exports = ControlPanel;
}


// Button click handler for CSV download
document.getElementById('downloadCsvBtn').addEventListener('click', async function() {
    try {
        // Show loading state
        const btn = this;
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Downloading...';
        btn.disabled = true;

        // Make request to download CSV
        const response = await fetch('http://localhost:3000/api/download-csv');
        
        if (!response.ok) {
            throw new Error('Failed to download CSV');
        }

        // Get the blob data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/:/, '-').split('.')[0];
        a.download = `test-history-${timestamp}.csv`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message (optional)
        console.log('CSV downloaded successfully');
        
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('Failed to download CSV. Please try again.');
    } finally {
        // Reset button state
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
});


//handle loading state of the games
