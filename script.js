// ========================================
// DAYFLOW - DAILY PLANNER
// ========================================


// CONSTANTS

const START_HOUR = 0;
const END_HOUR = 24;

// Must match the heights in style.css (3px per minute = 4320px per day)
const PIXELS_PER_MINUTE = 3;
const SLOT_MINUTES = 5;

const TOTAL_MINUTES = 1440;

// Layout thresholds (in pixels of block height)
const COMPACT_BELOW = 110;   // shorter than this -> single-row layout
const TINY_BELOW = 40;       // shorter than this -> expands on hover

const STORAGE_PREFIX = "dayflow_v2_";
const LIBRARY_STORAGE = "dayflow_v2_custom_tasks";


// HTML ELEMENTS

const taskLibrary = document.getElementById("taskLibrary");

const customTaskForm = document.getElementById("customTaskForm");
const customTaskName = document.getElementById("customTaskName");
const customTaskHours = document.getElementById("customTaskHours");
const customTaskMinutes = document.getElementById("customTaskMinutes");

const editModal = document.getElementById("editModal");
const editTaskName = document.getElementById("editTaskName");
const editTaskHours = document.getElementById("editTaskHours");
const editTaskMinutes = document.getElementById("editTaskMinutes");
const editCancel = document.getElementById("editCancel");
const editSave = document.getElementById("editSave");

const datePicker = document.getElementById("datePicker");
const dateStatus = document.getElementById("dateStatus");

const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const remainingTasks = document.getElementById("remainingTasks");
const progressPercentage = document.getElementById("progressPercentage");

const progressMessage = document.getElementById("progressMessage");
const progressCount = document.getElementById("progressCount");
const progressFill = document.getElementById("progressFill");

const calendarDate = document.getElementById("calendarDate");

const timelineWrapper = document.getElementById("timelineWrapper");
const timelineContent = document.getElementById("timelineContent");
const timeLabels = document.getElementById("timeLabels");

const reviewNotice = document.getElementById("reviewNotice");
const planningNotice = document.getElementById("planningNotice");

const toast = document.getElementById("toast");


// VARIABLES

let currentSchedule = [];
let draggedTask = null;
let toastTimeout = null;
let editingId = null;


// DATE FUNCTIONS

function getLocalDateString(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getToday() {
    return getLocalDateString();
}


function getSelectedDate() {
    return datePicker.value;
}


function getScheduleKey(date) {
    return STORAGE_PREFIX + date;
}


function isPastDate() {
    return getSelectedDate() < getToday();
}


function formatDate(dateString) {

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


function updateDateStatus() {

    const selectedDate = getSelectedDate();

    if (selectedDate < getToday()) {

        dateStatus.textContent = "Past schedule";
        reviewNotice.style.display = "block";
        planningNotice.style.display = "none";

    } else if (selectedDate === getToday()) {

        dateStatus.textContent = "Today's plan";
        reviewNotice.style.display = "none";
        planningNotice.style.display = "block";

    } else {

        dateStatus.textContent = "Future plan";
        reviewNotice.style.display = "none";
        planningNotice.style.display = "block";

    }

    calendarDate.textContent = formatDate(selectedDate);
}


// TIME FUNCTIONS

function formatTime(minutes) {

    let hours = Math.floor(minutes / 60);
    let mins = minutes % 60;

    const period = hours >= 12 && hours < 24 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return `${hours}:${String(mins).padStart(2, "0")} ${period}`;
}


function formatDuration(minutes) {

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
        return `${hours} hr ${mins} min`;
    }

    if (hours > 0) {
        return `${hours} hr`;
    }

    return `${mins} min`;
}


// FILL HOUR AND MINUTE DROPDOWNS

function fillDurationSelects(hoursSelect, minutesSelect, defaultHours, defaultMinutes) {

    hoursSelect.innerHTML = "";
    minutesSelect.innerHTML = "";

    for (let h = 0; h <= 24; h++) {
        const option = document.createElement("option");
        option.value = h;
        option.textContent = h + (h === 1 ? " hour" : " hours");
        hoursSelect.appendChild(option);
    }

    for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const option = document.createElement("option");
        option.value = m;
        option.textContent = m + " min";
        minutesSelect.appendChild(option);
    }

    hoursSelect.value = defaultHours;
    minutesSelect.value = defaultMinutes;
}


// CREATE TIMELINE LABELS

function createTimeLabels() {

    timeLabels.innerHTML = "";

    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {

        const label = document.createElement("div");

        label.className = "time-label";

        label.style.top = (hour * 60 * PIXELS_PER_MINUTE) + "px";

        label.textContent = formatTime(hour * 60);

        timeLabels.appendChild(label);

    }
}


// STORAGE FUNCTIONS

function loadSchedule() {

    const key = getScheduleKey(getSelectedDate());

    let savedData = null;

    try {
        savedData = localStorage.getItem(key);
    } catch (error) {
        savedData = null;
    }

    if (savedData) {

        try {

            currentSchedule = JSON.parse(savedData);

            if (!Array.isArray(currentSchedule)) {
                currentSchedule = [];
            }

        } catch (error) {

            currentSchedule = [];

        }

    } else {

        currentSchedule = [];

    }
}


function saveSchedule() {

    const key = getScheduleKey(getSelectedDate());

    try {
        localStorage.setItem(key, JSON.stringify(currentSchedule));
    } catch (error) {
        console.error("Could not save schedule:", error);
    }
}


function loadCustomTasks() {

    let savedTasks = null;

    try {
        savedTasks = localStorage.getItem(LIBRARY_STORAGE);
    } catch (error) {
        return;
    }

    if (!savedTasks) return;

    try {

        const tasks = JSON.parse(savedTasks);

        if (Array.isArray(tasks)) {

            tasks.forEach(task => {
                createLibraryTask(task.name, task.duration);
            });

        }

    } catch (error) {

        console.error("Could not load custom tasks:", error);

    }
}


function saveCustomTasks() {

    const tasks = [];

    document.querySelectorAll(".custom-library-task").forEach(task => {

        tasks.push({
            name: task.dataset.name,
            duration: Number(task.dataset.duration)
        });

    });

    try {
        localStorage.setItem(LIBRARY_STORAGE, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save custom tasks:", error);
    }
}


// TOAST MESSAGE

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// CREATE LIBRARY TASK

function createLibraryTask(name, duration) {

    const task = document.createElement("div");

    task.className = "library-task custom-library-task";

    task.draggable = true;

    task.dataset.name = name;

    task.dataset.duration = duration;

    task.innerHTML = `
        <div class="task-color teal"></div>

        <div class="library-task-info">
            <strong></strong>
            <span></span>
        </div>

        <span class="drag-icon">⠿</span>
    `;

    task.querySelector("strong").textContent = name;

    task.querySelector(".library-task-info span").textContent =
        formatDuration(duration);

    taskLibrary.appendChild(task);

    return task;
}


// CUSTOM TASK FORM

customTaskForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name = customTaskName.value.trim();

    const duration =
        Number(customTaskHours.value) * 60 +
        Number(customTaskMinutes.value);

    if (!name) {
        showToast("Please enter a task name.");
        return;
    }

    if (duration < SLOT_MINUTES) {
        showToast("Please choose a duration of at least 5 minutes.");
        return;
    }

    if (duration > TOTAL_MINUTES) {
        showToast("A task cannot be longer than 24 hours.");
        return;
    }

    createLibraryTask(name, duration);

    saveCustomTasks();

    customTaskForm.reset();

    fillDurationSelects(customTaskHours, customTaskMinutes, 0, 30);

    showToast("Custom task added to your library!");
});


// DRAG TASKS FROM LIBRARY

taskLibrary.addEventListener("dragstart", function(event) {

    const task = event.target.closest(".library-task");

    if (!task) return;

    draggedTask = {
        type: "library",
        name: task.dataset.name,
        duration: Number(task.dataset.duration)
    };

    event.dataTransfer.effectAllowed = "copy";

    event.dataTransfer.setData(
        "text/plain",
        JSON.stringify(draggedTask)
    );
});


taskLibrary.addEventListener("dragend", function() {

    draggedTask = null;

    timelineContent.classList.remove("drag-active");
});


// OVERLAP CHECK

function hasOverlap(start, duration, ignoredId = null) {

    const end = start + duration;

    return currentSchedule.some(task => {

        if (task.id === ignoredId) {
            return false;
        }

        const existingStart = task.start;
        const existingEnd = task.start + task.duration;

        return start < existingEnd && end > existingStart;

    });
}


// FIND THE NEAREST FREE START TIME
// The task's TOP edge goes where you drop it, but the task extends downward.
// If the exact spot doesn't fit, look for the closest slot that does.

function findFreeStart(desiredStart, duration, ignoredId = null) {

    const maxStart = TOTAL_MINUTES - duration;

    if (maxStart < 0) return null;

    let base = Math.round(desiredStart / SLOT_MINUTES) * SLOT_MINUTES;

    base = Math.max(0, Math.min(maxStart, base));

    if (!hasOverlap(base, duration, ignoredId)) {
        return base;
    }

    for (let offset = SLOT_MINUTES; offset <= TOTAL_MINUTES; offset += SLOT_MINUTES) {

        const after = base + offset;
        const before = base - offset;

        if (after <= maxStart && !hasOverlap(after, duration, ignoredId)) {
            return after;
        }

        if (before >= 0 && !hasOverlap(before, duration, ignoredId)) {
            return before;
        }

    }

    return null;
}


// ADD TASK TO SCHEDULE

function addTaskToSchedule(name, duration, desiredStart) {

    if (isPastDate()) {
        showToast("Past schedules cannot be changed.");
        return;
    }

    if (!Number.isFinite(desiredStart) || !Number.isFinite(duration)) {
        showToast("Invalid task time.");
        return;
    }

    const start = findFreeStart(desiredStart, duration);

    if (start === null) {
        showToast("No free time slot is long enough for this task.");
        return;
    }

    const newTask = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        name: name,
        start: start,
        duration: duration,
        completed: false
    };

    currentSchedule.push(newTask);

    currentSchedule.sort((a, b) => a.start - b.start);

    saveSchedule();
    renderTimeline();
    updateStatistics();

    const requested = Math.round(desiredStart / SLOT_MINUTES) * SLOT_MINUTES;

    if (start !== requested) {
        showToast(`Placed at ${formatTime(start)} (nearest free slot).`);
    } else {
        showToast("Task added to your timeline!");
    }
}


// MOVE EXISTING TASK

function moveExistingTask(id, desiredStart) {

    if (isPastDate()) {
        showToast("Past schedules cannot be changed.");
        return;
    }

    const task = currentSchedule.find(item => item.id === id);

    if (!task) return;

    const newStart = findFreeStart(desiredStart, task.duration, id);

    if (newStart === null) {
        showToast("No free time slot is long enough for this task.");
        return;
    }

    task.start = newStart;

    currentSchedule.sort((a, b) => a.start - b.start);

    saveSchedule();
    renderTimeline();
    updateStatistics();

    showToast("Task moved successfully!");
}


// DELETE TASK

function deleteTask(id) {

    if (isPastDate()) {
        showToast("Past schedules cannot be changed.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this task?");

    if (!confirmDelete) return;

    currentSchedule = currentSchedule.filter(task => task.id !== id);

    saveSchedule();
    renderTimeline();
    updateStatistics();

    showToast("Task deleted!");
}


// EDIT TASK (opens the popup)

function editTask(id) {

    if (isPastDate()) {
        showToast("Past schedules cannot be changed.");
        return;
    }

    const task = currentSchedule.find(item => item.id === id);

    if (!task) return;

    editingId = id;

    editTaskName.value = task.name;

    editTaskHours.value = Math.floor(task.duration / 60);
    editTaskMinutes.value = task.duration % 60;

    editModal.classList.add("show");

    editTaskName.focus();
}


function closeEditModal() {

    editModal.classList.remove("show");

    editingId = null;
}


function saveEditedTask() {

    const task = currentSchedule.find(item => item.id === editingId);

    if (!task) {
        closeEditModal();
        return;
    }

    const trimmedName = editTaskName.value.trim();

    const duration =
        Number(editTaskHours.value) * 60 +
        Number(editTaskMinutes.value);

    if (!trimmedName) {
        showToast("Task name cannot be empty.");
        return;
    }

    if (duration < SLOT_MINUTES) {
        showToast("Please choose a duration of at least 5 minutes.");
        return;
    }

    if (task.start + duration > TOTAL_MINUTES) {
        showToast("Task cannot go beyond midnight.");
        return;
    }

    if (hasOverlap(task.start, duration, task.id)) {
        showToast("The new duration overlaps another task.");
        return;
    }

    task.name = trimmedName;
    task.duration = duration;

    saveSchedule();
    renderTimeline();
    updateStatistics();

    closeEditModal();

    showToast("Task updated!");
}


editSave.addEventListener("click", saveEditedTask);

editCancel.addEventListener("click", closeEditModal);

editModal.addEventListener("click", function(event) {
    if (event.target === editModal) {
        closeEditModal();
    }
});

document.addEventListener("keydown", function(event) {

    if (!editModal.classList.contains("show")) return;

    if (event.key === "Escape") {
        closeEditModal();
    }

    if (event.key === "Enter" && document.activeElement === editTaskName) {
        saveEditedTask();
    }
});


// COMPLETE TASK

function toggleComplete(id) {

    const task = currentSchedule.find(item => item.id === id);

    if (!task) return;

    task.completed = !task.completed;

    saveSchedule();
    renderTimeline();
    updateStatistics();

    if (task.completed) {
        showToast("Great work! Task completed.");
    } else {
        showToast("Task marked as incomplete.");
    }
}


// BUTTON HELPER (icon + label; label is hidden on compact blocks)

function createActionButton(className, icon, label, onClick) {

    const button = document.createElement("button");

    button.type = "button";

    button.className = className;

    button.title = label;

    button.setAttribute("aria-label", label);

    const iconSpan = document.createElement("span");
    iconSpan.className = "btn-icon";
    iconSpan.textContent = icon;

    const labelSpan = document.createElement("span");
    labelSpan.className = "btn-label";
    labelSpan.textContent = label;

    button.appendChild(iconSpan);
    button.appendChild(labelSpan);

    button.addEventListener("click", function(clickEvent) {
        clickEvent.stopPropagation();
        onClick();
    });

    return button;
}


// CREATE TASK ELEMENT

function createTimelineEvent(task) {

    const eventEl = document.createElement("div");

    eventEl.className = "timeline-event";

    const height = task.duration * PIXELS_PER_MINUTE;

    if (task.completed) {
        eventEl.classList.add("completed");
    }

    if (height < COMPACT_BELOW) {
        eventEl.classList.add("compact");
    }

    if (height < TINY_BELOW) {
        eventEl.classList.add("tiny");
    }

    eventEl.style.top = (task.start * PIXELS_PER_MINUTE) + "px";

    eventEl.style.height = height + "px";

    eventEl.dataset.id = task.id;

    eventEl.draggable = !isPastDate();

    // Info (title + time)

    const info = document.createElement("div");

    info.className = "event-info";

    const title = document.createElement("div");

    title.className = "event-title";

    title.textContent = task.name;

    const time = document.createElement("div");

    time.className = "event-time";

    time.textContent =
        `${formatTime(task.start)} – ${formatTime(task.start + task.duration)} (${formatDuration(task.duration)})`;

    info.appendChild(title);
    info.appendChild(time);

    // Buttons

    const actions = document.createElement("div");

    actions.className = "event-actions";

    actions.appendChild(
        createActionButton(
            "complete-button",
            task.completed ? "↺" : "✓",
            task.completed ? "Undo" : "Done",
            () => toggleComplete(task.id)
        )
    );

    if (!isPastDate()) {

        actions.appendChild(
            createActionButton("edit-button", "✎", "Edit", () => editTask(task.id))
        );

        actions.appendChild(
            createActionButton("delete-button", "✕", "Delete", () => deleteTask(task.id))
        );

    }

    eventEl.appendChild(info);
    eventEl.appendChild(actions);

    // Drag existing task

    eventEl.addEventListener("dragstart", function(dragEvent) {

        if (isPastDate()) {
            dragEvent.preventDefault();
            return;
        }

        draggedTask = {
            type: "event",
            id: task.id
        };

        dragEvent.dataTransfer.effectAllowed = "move";

        dragEvent.dataTransfer.setData(
            "text/plain",
            JSON.stringify(draggedTask)
        );

        dragEvent.currentTarget.classList.add("dragging");
    });

    eventEl.addEventListener("dragend", function(dragEvent) {

        dragEvent.currentTarget.classList.remove("dragging");

        draggedTask = null;

        timelineContent.classList.remove("drag-active");
    });

    return eventEl;
}


// CURRENT TIME INDICATOR

function updateCurrentTimeLine() {

    const oldLine = timelineContent.querySelector(".current-time-line");

    if (oldLine) {
        oldLine.remove();
    }

    if (getSelectedDate() !== getToday()) {
        return;
    }

    const now = new Date();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const line = document.createElement("div");

    line.className = "current-time-line";

    line.style.top = (currentMinutes * PIXELS_PER_MINUTE) + "px";

    timelineContent.appendChild(line);
}


// RENDER TIMELINE

function renderTimeline() {

    timelineContent.innerHTML = "";

    currentSchedule.sort((a, b) => a.start - b.start);

    currentSchedule.forEach(task => {
        timelineContent.appendChild(createTimelineEvent(task));
    });

    updateCurrentTimeLine();
}


// UPDATE STATISTICS

function updateStatistics() {

    const total = currentSchedule.length;

    const completed = currentSchedule.filter(task => task.completed).length;

    const remaining = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    remainingTasks.textContent = remaining;
    progressPercentage.textContent = percentage + "%";
    progressCount.textContent = `${completed} / ${total} completed`;
    progressFill.style.width = percentage + "%";

    if (total === 0) {
        progressMessage.textContent = "Start planning your day!";
    } else if (percentage === 100) {
        progressMessage.textContent = "Amazing! You completed everything.";
    } else if (percentage >= 70) {
        progressMessage.textContent = "You're doing great. Keep going!";
    } else if (percentage >= 30) {
        progressMessage.textContent = "Good progress. Keep it up!";
    } else {
        progressMessage.textContent = "One task at a time. You've got this!";
    }
}


// TIMELINE DROP EVENTS

timelineContent.addEventListener("dragover", function(event) {

    if (isPastDate()) return;

    event.preventDefault();

    timelineContent.classList.add("drag-active");

    event.dataTransfer.dropEffect =
        draggedTask && draggedTask.type === "event" ? "move" : "copy";
});


timelineContent.addEventListener("dragleave", function(event) {

    if (!timelineContent.contains(event.relatedTarget)) {
        timelineContent.classList.remove("drag-active");
    }
});


timelineContent.addEventListener("drop", function(event) {

    event.preventDefault();

    timelineContent.classList.remove("drag-active");

    if (isPastDate()) {
        showToast("Past schedules cannot be changed.");
        return;
    }

    let data = draggedTask;

    try {

        const storedData = event.dataTransfer.getData("text/plain");

        if (storedData) {
            data = JSON.parse(storedData);
        }

    } catch (error) {

        if (!data) {
            showToast("Unable to place this task.");
            return;
        }

    }

    if (!data) return;

    // getBoundingClientRect already accounts for scrolling

    const rect = timelineContent.getBoundingClientRect();

    const position = event.clientY - rect.top;

    const start = Math.floor(
        position / PIXELS_PER_MINUTE / SLOT_MINUTES
    ) * SLOT_MINUTES;

    if (data.type === "event") {

        moveExistingTask(data.id, start);

    } else if (data.type === "library") {

        addTaskToSchedule(data.name, data.duration, start);

    }

    draggedTask = null;
});


// DATE CHANGE

datePicker.addEventListener("change", function() {

    if (!datePicker.value) return;

    loadSchedule();
    updateDateStatus();
    renderTimeline();
    updateStatistics();

    timelineWrapper.scrollTop = 0;
});


// INITIALISE WEBSITE

function initializeDayflow() {

    datePicker.value = getToday();

    fillDurationSelects(customTaskHours, customTaskMinutes, 0, 30);
    fillDurationSelects(editTaskHours, editTaskMinutes, 0, 30);

    createTimeLabels();
    loadCustomTasks();
    loadSchedule();
    updateDateStatus();
    renderTimeline();
    updateStatistics();

    // Start the view about an hour before the current time
    const now = new Date();
    const focusMinutes = Math.max(0, now.getHours() * 60 - 60);
    timelineWrapper.scrollTop = focusMinutes * PIXELS_PER_MINUTE;
}


// START WEBSITE

initializeDayflow();


// MOVE THE CURRENT TIME LINE EVERY MINUTE
// (only the line moves; the timeline is not re-rendered, so dragging is never interrupted)

setInterval(function() {

    if (!draggedTask) {
        updateCurrentTimeLine();
    }

}, 60000);
