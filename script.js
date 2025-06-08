// Window Management Variables
let windowCounter = 0;
let activeWindow = null;
const windows = new Map();

// Window dragging variables
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;
let dragElement = null;

// Task Management Variables (per window)
const windowTaskData = new Map(); // Maps windowId to task data

const desktop = document.getElementById('desktop');
const openTaskAppBtn = document.getElementById('openTaskApp');
const windowButtons = document.getElementById('windowButtons');

// Create new task manager window
function createTaskWindow() {
    windowCounter++;
    const windowId = `window-${windowCounter}`;
    
    const container = document.createElement('div');
    container.className = 'container';
    container.id = windowId;
    container.style.left = `${50 + (windowCounter * 30)}px`;
    container.style.top = `${50 + (windowCounter * 30)}px`;
    
    container.innerHTML = `
        <div class="window">
            <h1>Task Management ${windowCounter}</h1>
            <button class="close-btn" onclick="closeWindow('${windowId}')">×</button>
        </div>
        <div class="tab">
            <div class="col-list">
                <div class="list-header-container">
                    <div class="list-header">
                        <h2 data-filter="pending">pending</h2>
                        <h2 data-filter="completed">completed</h2>
                        <h2 class="active" data-filter="all">all</h2>
                    </div>
                </div>
                <div class="list-container">
                </div>
                <div class="control">
                    <input type="text" id="titleTask-${windowCounter}" placeholder="Enter task title...">
                    <input type="button" id="addTask-${windowCounter}" value="Create">
                </div>
            </div>
            <div class="col-note">
                <div class="note-header">
                    <h2 id="noteTitle-${windowCounter}">Select a task to view details</h2>
                </div>
                <div class="note-container" id="noteContainer-${windowCounter}" contenteditable="false">
                    <p>Click on any task to view or edit its details here.</p>
                </div>
            </div>
        </div>
    `;

    desktop.appendChild(container);
    
    // Add to windows map
    windows.set(windowId, container);
    
    // Initialize task data for this window
    windowTaskData.set(windowId, {
        taskCounter: 1,
        currentFilter: 'all',
        selectedTask: null,
        taskData: new Map()
    });
    
    // Setup task functionality for this window
    setupTaskFunctionality(windowId);
    
    // Create taskbar button
    createWindowButton(windowId, `Task Manager ${windowCounter}`);
    
    // Set as active window
    setActiveWindow(windowId);
    
    // Add click event to make window active
    container.addEventListener('mousedown', () => setActiveWindow(windowId));
}

// Setup task functionality for a specific window
function setupTaskFunctionality(windowId) {
    const windowData = windowTaskData.get(windowId);
    const container = windows.get(windowId);
    
    const addButton = container.querySelector(`#addTask-${windowId.split('-')[1]}`);
    const addInput = container.querySelector(`#titleTask-${windowId.split('-')[1]}`);
    const listContainer = container.querySelector(".list-container");
    const noteTitle = container.querySelector(`#noteTitle-${windowId.split('-')[1]}`);
    const noteContainer = container.querySelector(`#noteContainer-${windowId.split('-')[1]}`);
    const listHeader = container.querySelectorAll(".list-header h2");

    // Filter functionality
    listHeader.forEach(btn => {
        btn.addEventListener('click', () => {
            const current = container.querySelector(".list-header h2.active");
            if (current) current.classList.remove("active");
            btn.classList.add("active");
            
            // Update current filter and apply it
            windowData.currentFilter = btn.getAttribute('data-filter');
            applyFilter(windowId);
        });
    });

    // Function to apply filter based on current selection
    function applyFilter(windowId) {
        const container = windows.get(windowId);
        const allCards = container.querySelectorAll('.list-card');
        const windowData = windowTaskData.get(windowId);
        
        allCards.forEach(card => {
            const checkbox = card.querySelector('.checkbox');
            const isCompleted = checkbox.classList.contains('checked');
            
            switch(windowData.currentFilter) {
                case 'pending':
                    card.style.display = isCompleted ? 'none' : 'flex';
                    break;
                case 'completed':
                    card.style.display = isCompleted ? 'flex' : 'none';
                    break;
                case 'all':
                default:
                    card.style.display = 'flex';
                    break;
            }
        });
    }

    // Function to select a task and show its note
    function selectTask(taskId, taskElement, windowId) {
        const container = windows.get(windowId);
        const windowData = windowTaskData.get(windowId);
        const noteTitle = container.querySelector(`#noteTitle-${windowId.split('-')[1]}`);
        const noteContainer = container.querySelector(`#noteContainer-${windowId.split('-')[1]}`);
        
        // Remove previous selection
        const previousSelected = container.querySelector('.list-card.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Add selection to current task
        taskElement.classList.add('selected');
        windowData.selectedTask = taskId;
        
        // Get task data
        const data = windowData.taskData.get(taskId);
        const taskTitle = taskElement.querySelector('h2').textContent;
        
        // Update note section
        noteTitle.textContent = taskTitle;
        noteContainer.innerHTML = data.note || '<p>No details added yet. Click here to add details.</p>';
        
        // Make note container editable
        noteContainer.contentEditable = true;
        noteContainer.style.cursor = 'text';
    }

    // Function to create a new task card
    function createTaskCard(taskText, windowId) {
        const windowData = windowTaskData.get(windowId);
        const taskId = `task_${windowData.taskCounter}`;
        const card = document.createElement('div');
        card.className = 'list-card';
        card.setAttribute('data-task-id', taskId);
        card.innerHTML = `
            <h2>${taskText}</h2>
            <span class="checkbox"></span>
        `;
        
        // Initialize task data
        windowData.taskData.set(taskId, {
            title: taskText,
            note: '',
            completed: false
        });
        
        // Add click event to checkbox
        const checkbox = card.querySelector('.checkbox');
        checkbox.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('checked');
            
            // Update task data
            const data = windowData.taskData.get(taskId);
            data.completed = this.classList.contains('checked');
            
            // Reapply filter after checkbox state changes
            applyFilter(windowId);
        });
        
        // Add click event to card (excluding checkbox)
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('checkbox')) {
                selectTask(taskId, card, windowId);
            }
        });
        
        windowData.taskCounter++;
        return card;
    }

    // Auto-save note content when it changes
    noteContainer.addEventListener('input', () => {
        const windowData = windowTaskData.get(windowId);
        if (windowData.selectedTask) {
            const data = windowData.taskData.get(windowData.selectedTask);
            data.note = noteContainer.innerHTML;
        }
    });

    // Prevent losing focus when clicking in the note container
    noteContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Add new task when button is clicked
    addButton.addEventListener("click", () => {
        let taskText = addInput.value.trim();
        if (taskText) {
            const newCard = createTaskCard(taskText, windowId);
            listContainer.appendChild(newCard);
            addInput.value = ''; // Clear input after adding
            // Apply current filter to new task
            applyFilter(windowId);
            
            // Auto-select the new task
            const taskId = newCard.getAttribute('data-task-id');
            selectTask(taskId, newCard, windowId);
        }
    });

    // Allow adding tasks with Enter key
    addInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            addButton.click();
        }
    });

    // Initial state - make note container non-editable initially
    noteContainer.contentEditable = false;
    noteContainer.style.cursor = 'default';
}

// Create window button in taskbar
function createWindowButton(windowId, title) {
    const btn = document.createElement('button');
    btn.className = 'window-btn';
    btn.id = `btn-${windowId}`;
    btn.textContent = title;
    btn.onclick = () => focusWindow(windowId);
    windowButtons.appendChild(btn);
}

// Close window
function closeWindow(windowId) {
    const container = windows.get(windowId);
    const btn = document.getElementById(`btn-${windowId}`);
    
    if (container) {
        container.remove();
        windows.delete(windowId);
        windowTaskData.delete(windowId);
    }
    
    if (btn) {
        btn.remove();
    }
    
    // If this was the active window, activate another one
    if (activeWindow === windowId) {
        activeWindow = null;
        const remainingWindows = Array.from(windows.keys());
        if (remainingWindows.length > 0) {
            setActiveWindow(remainingWindows[0]);
        }
    }
}

// Set active window
function setActiveWindow(windowId) {
    // Remove active class from all windows and buttons
    document.querySelectorAll('.container').forEach(w => w.classList.remove('active'));
    document.querySelectorAll('.window-btn').forEach(b => b.classList.remove('active'));
    
    // Set new active window
    const container = windows.get(windowId);
    const btn = document.getElementById(`btn-${windowId}`);
    
    if (container) {
        container.classList.add('active');
        activeWindow = windowId;
    }
    
    if (btn) {
        btn.classList.add('active');
    }
}

// Focus window (bring to front)
function focusWindow(windowId) {
    setActiveWindow(windowId);
}

// Dragging functionality
function dragStart(e) {
    const windowHeader = e.target.closest('.window');
    if (!windowHeader) return;
    
    const container = windowHeader.closest('.container');
    if (!container) return;
    
    // Don't drag if clicking on close button
    if (e.target.classList.contains('close-btn')) return;
    
    dragElement = container;
    
    // Get current position of the window
    const rect = container.getBoundingClientRect();
    
    // Calculate offset from mouse to window's top-left corner
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
    
    isDragging = true;
    windowHeader.style.cursor = 'grabbing';
    
    // Remove any transitions during drag for instant response
    container.style.transition = 'none';
    
    setActiveWindow(container.id);
}

function drag(e) {
    if (isDragging && dragElement) {
        e.preventDefault();
        
        // Calculate new position directly from mouse position minus initial offset
        let newX = e.clientX - initialX;
        let newY = e.clientY - initialY;
        
        // Keep window within bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - dragElement.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - dragElement.offsetHeight - 60));
        
        // Apply position immediately
        dragElement.style.left = newX + 'px';
        dragElement.style.top = newY + 'px';
    }
}

function dragEnd() {
    if (isDragging && dragElement) {
        const windowHeader = dragElement.querySelector('.window');
        windowHeader.style.cursor = 'grab';
        
        // Restore transitions after drag ends
        dragElement.style.transition = 'all 0.3s ease';
        
        isDragging = false;
        dragElement = null;
    }
}

// Event listeners
openTaskAppBtn.addEventListener('click', createTaskWindow);
document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

// Prevent text selection while dragging
document.addEventListener('selectstart', (e) => {
    if (isDragging) {
        e.preventDefault();
    }
});

// Create initial window
createTaskWindow();
