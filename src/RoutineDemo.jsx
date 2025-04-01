// RoutineDemo.jsx — includes full daily check-in UI AND weekly summary
import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Add this utility function at the top of your file
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

function parseDate(dateStr) {
  // Parse date in YYYY-MM-DD format ensuring the date doesn't shift
  if (!dateStr) return null;
  
  // Split the string and create a date at the local timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  // Ensure we get the correct date regardless of timezone
  return date;
}

function formatDate(dateStr) {
  // Ensure we're working with a Date object
  const dateObj = dateStr instanceof Date ? dateStr : new Date(dateStr);
  
  // Format to YYYY-MM-DD using local timezone
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

function getWeekRange(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day + offset * 7);
  sunday.setHours(0, 0, 0, 0); // Start of day
  
  // Calculate end of week (Saturday)
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999); // End of day
  
  return [sunday, saturday];
}

// Add a constant for the storage key for consistency
const STORAGE_KEY = "routineData_v1";

export default function RoutineDemo() {
  const [anchors, setAnchors] = useState(["", "", ""]);
  const [explore, setExplore] = useState("");
  const [journal, setJournal] = useState("");
  const [mood, setMood] = useState(3);
  const [done, setDone] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [completed, setCompleted] = useState([false, false, false]);
  const [history, setHistory] = useState([]);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [chartRange, setChartRange] = useState("this");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState("daily"); // "daily", "weekly", or "calendar"
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Load data on initial mount only
    const loadData = () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (savedData && savedData !== "undefined" && savedData !== "null") {
          const parsed = JSON.parse(savedData);
          
          if (parsed.history && Array.isArray(parsed.history)) {
            setHistory(parsed.history);
          }
          
          if (parsed.anchors) setAnchors(parsed.anchors);
          if (parsed.explore !== undefined) setExplore(parsed.explore);
          if (parsed.journal !== undefined) setJournal(parsed.journal);
          if (parsed.mood !== undefined) setMood(parsed.mood);
          if (parsed.done !== undefined) setDone(parsed.done);
          if (parsed.checkIn !== undefined) setCheckIn(parsed.checkIn);
          if (parsed.completed) setCompleted(parsed.completed);
          if (parsed.dateInput) setDateInput(parsed.dateInput);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    
    loadData();
  }, []);

  const saveAllData = () => {
    const dataToSave = {
      anchors,
      explore,
      journal,
      mood,
      done,
      checkIn,
      completed,
      history,
      dateInput,
      lastSaved: new Date().toISOString()
    };
    
    try {
      const dataString = JSON.stringify(dataToSave);
      localStorage.setItem(STORAGE_KEY, dataString);
      
      // Double-check to verify it saved correctly
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.error("Failed to save - no data returned when verifying");
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const debouncedSave = useCallback(
    debounce(() => {
      saveAllData();
    }, 300),
    [anchors, explore, journal, mood, done, checkIn, completed, history, dateInput]
  );

  useEffect(() => {
    debouncedSave();
  }, [anchors, explore, journal, mood, done, checkIn, completed, history, dateInput, debouncedSave]);

  const handleAnchorChange = (index, value) => {
    const newAnchors = [...anchors];
    newAnchors[index] = value;
    setAnchors(newAnchors);
  };

  const toggleCompleted = (index) => {
    const newCompleted = [...completed];
    newCompleted[index] = !newCompleted[index];
    setCompleted(newCompleted);

    // Important: Update the history entry immediately
    if (done) {
      const formattedDate = dateInput;
      const updated = history.map(entry => {
        if (entry.date === formattedDate) {
          return { ...entry, completed: newCompleted };
        }
        return entry;
      });
      setHistory(updated);
    }

    // After all state changes
    setTimeout(saveAllData, 50);
  };

  const handleSubmit = () => {
    setDone(true);
    const formattedDate = dateInput;
    const newEntry = {
      date: formattedDate,
      anchors: anchors.filter(Boolean),
      explore,
      journal: "",
      mood: 0,
      completed,
    };
    const updated = history.filter(e => e.date !== formattedDate);
    
    // Set state and then explicitly save
    setHistory(prevHistory => {
      const newHistory = [newEntry, ...updated];
      // Use setTimeout to ensure this happens after state update
      setTimeout(saveAllData, 50);
      return newHistory;
    });
  };

  const handleCheckIn = () => {
    const formattedDate = dateInput;
    
    if (checkIn) {
      setHistory(prevHistory => {
        const updated = prevHistory.map(entry => {
          if (entry.date === formattedDate) {
            return { ...entry, journal: "", mood: 0 };
          }
          return entry;
        });
        setTimeout(saveAllData, 50);
        return updated;
      });
      setCheckIn(false);
      setJournal("");
      setMood(3);
    } else {
      setHistory(prevHistory => {
        const updated = prevHistory.map(entry => {
          if (entry.date === formattedDate) {
            return { ...entry, journal, mood };
          }
          return entry;
        });
        setTimeout(saveAllData, 50);
        return updated;
      });
      setCheckIn(true);
    }
  };

  const resetForm = () => {
    setAnchors(["", "", ""]);
    setExplore("");
    setJournal("");
    setMood(3);
    setDone(false);
    setCheckIn(false);
    setCompleted([false, false, false]);

    // After all state changes
    setTimeout(saveAllData, 50);
  };

  const getFilteredChartData = () => {
    let filtered = [...history];
    let start, end;
  
    if (chartRange === "this") {
      [start, end] = getWeekRange(0);
    } else if (chartRange === "last") {
      [start, end] = getWeekRange(-1);
    } else if (chartRange === "custom" && customStart && customEnd) {
      start = parseDate(customStart);
      end = parseDate(customEnd);
    }
  
    // Set time boundaries for accurate comparisons
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
  
    filtered = filtered.filter(entry => {
      if (!start || !end) return true;
      
      const entryDate = parseDate(entry.date);
      // Set time to noon to avoid timezone issues
      entryDate.setHours(12, 0, 0, 0);
      
      return entryDate >= start && entryDate <= end;
    });
  
    return filtered.map(entry => ({
      date: entry.date,
      completed: entry.completed?.filter(Boolean).length || 0,
      mood: entry.mood || 0,
      anchors: entry.anchors,
      explore: entry.explore,
      journal: entry.journal,
      completedList: entry.completed,
    })).sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateA - dateB;
    });
  };

  const generateCalendarDays = () => {
    // Use calendarMonth and calendarYear instead of current date
    const currentMonth = calendarMonth;
    const currentYear = calendarYear;
    
    // Create date for the first day of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    // Get the number of days in the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Create calendar grid with empty slots for previous month days
    const calendarDays = [];
    
    // Add empty slots for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push({ day: null, empty: true });
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(currentYear, currentMonth, day));
      const entry = history.find(e => e.date === dateStr);
      
      // Calculate the number of tasks and completed tasks properly
      const anchors = entry?.anchors || [];
      // Filter out empty tasks
      const validAnchors = anchors.filter(Boolean);
      const numberOfTasks = validAnchors.length;
      const tasksCompleted = entry?.completed?.filter(Boolean).length || 0;
      
      calendarDays.push({
        day,
        date: dateStr,
        hasEntry: !!entry,
        isCheckedIn: entry?.mood > 0,
        mood: entry?.mood || 0,
        anchors: validAnchors,
        tasksCompleted: tasksCompleted,
        numberOfTasks: numberOfTasks
      });
    }
    
    return calendarDays;
  };

  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  };

  // Add this function to handle loading an entry for editing
  const loadEntryForEdit = (date) => {
    const entry = history.find(e => e.date === date);
    if (entry) {
      setDateInput(date);
      setDone(true);
      setAnchors(entry.anchors.length ? [...entry.anchors, ...Array(3-entry.anchors.length).fill("")] : ["", "", ""]);
      setExplore(entry.explore || "");
      setJournal(entry.journal || "");
      setMood(entry.mood || 3);
      setCompleted(entry.completed || [false, false, false]);
      setCheckIn(entry.mood > 0);
      setViewMode("daily");
    }
  };

  const chartData = getFilteredChartData();

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      
      <div className="text-right flex justify-end space-x-2">
        <button
          className={`text-sm px-2 py-1 rounded ${viewMode === "daily" ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-100"}`}
          onClick={() => setViewMode("daily")}
        >
          📝 Daily
        </button>
        <button
          className={`text-sm px-2 py-1 rounded ${viewMode === "weekly" ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-100"}`}
          onClick={() => setViewMode("weekly")}
        >
          📊 Weekly
        </button>
        <button
          className={`text-sm px-2 py-1 rounded ${viewMode === "calendar" ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-100"}`}
          onClick={() => setViewMode("calendar")}
        >
          📅 Calendar
        </button>
      </div>

      {viewMode === "daily" && !done && (
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <h2 className="font-semibold">📆 Select a Day to Log</h2>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />

          <h2 className="font-semibold mt-4">✅ Today’s Anchor Tasks (up to 3)</h2>
          {anchors.map((task, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Task ${index + 1}`}
              value={task}
              onChange={(e) => handleAnchorChange(index, e.target.value)}
              className="w-full border rounded px-3 py-2 my-1"
            />
          ))}

          <h2 className="font-semibold">🌈 Exploration Prompt</h2>
          <textarea
            value={explore}
            onChange={(e) => setExplore(e.target.value)}
            placeholder="Try something different today..."
            className="w-full border rounded px-3 py-2"
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            🎯 Submit & Start for This Date
          </button>
        </div>
      )}

      {viewMode === "daily" && done && (
        <div className="bg-white p-4 rounded-xl shadow space-y-4 text-center">
          <h2 className="text-xl font-semibold">🎉 You've set your flow!</h2>
          <ul className="list-none text-left space-y-3 pl-2">
            {anchors.map((task, i) =>
              task ? (
                <li key={i} className="flex items-center gap-3">
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      id={`task-${i}`}
                      checked={completed[i]}
                      onChange={() => toggleCompleted(i)}
                      className="appearance-none h-5 w-5 border border-gray-300 rounded checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer"
                    />
                    {completed[i] && (
                      <svg 
                        className="absolute inset-0 w-5 h-5 text-white pointer-events-none" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <label 
                    htmlFor={`task-${i}`}
                    className={`cursor-pointer ${completed[i] ? "line-through text-gray-500" : ""}`}
                  >
                    {task}
                  </label>
                </li>
              ) : null
            )}
          </ul>

          <p className="italic mt-4">🌱 Exploration: {explore || "Not specified"}</p>

          <div className="text-left space-y-4">
            <h2 className="font-semibold">📝 How did you feel?</h2>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="Reflect on your mood or energy..."
              className="w-full border rounded px-3 py-2"
            />
            <label className="block font-medium mb-1">😊 Mood score (1–5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-col items-center gap-2 mt-4">
            <button
              onClick={handleCheckIn}
              className={`w-full py-2 rounded text-white ${
                checkIn ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {checkIn ? "↩️ Undo Check-in" : "📌 Check In for This Date"}
            </button>
            <button
              onClick={resetForm}
              className="w-full py-2 rounded border text-gray-700 hover:bg-gray-100"
            >
              🔄 Reset
            </button>
            {!checkIn && (
              <button
                onClick={() => setDone(false)}
                className="w-full text-sm text-blue-500 hover:underline mt-2"
              >
                ✏️ Edit Plan
              </button>
            )}
            {checkIn && (
              <button
                onClick={() => {
                  // Keep done status but reset check-in fields
                  setJournal("");
                  setMood(3);
                  setCheckIn(false);
                }}
                className="w-full text-sm text-blue-500 hover:underline mt-2"
              >
                📝 Start Fresh Check-in
              </button>
            )}
          </div>
        </div>
      )}

      {viewMode === "weekly" && (
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <h2 className="text-lg font-bold">📊 Weekly Summary</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="font-medium">Time Range:</label>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="this">This Week</option>
              <option value="last">Last Week</option>
              <option value="custom">Custom Range</option>
            </select>
            {chartRange === "custom" && (
              <div className="flex gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#3b82f6" name="Tasks Completed" />
              <Line type="monotone" dataKey="mood" stroke="#f59e0b" name="Mood Score" />
            </LineChart>
          </ResponsiveContainer>

          {chartData.map((entry, index) => (
            <details key={index} className="border rounded p-3">
              <summary className="cursor-pointer font-medium">📅 {entry.date}</summary>
              <div className="pl-4">
                <p><strong>✅ Anchor Tasks:</strong></p>
                <ul className="list-disc pl-6">
                  {entry.anchors?.map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <div 
                          className={`h-4 w-4 border rounded ${
                            entry.completedList && entry.completedList[i] 
                              ? "bg-blue-500 border-blue-500" 
                              : "border-gray-400"
                          }`}
                        >
                          {entry.completedList && entry.completedList[i] && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className={entry.completedList && entry.completedList[i] ? "line-through text-gray-500" : ""}>
                        {task}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2"><strong>🌈 Exploration:</strong> {entry.explore || "None"}</p>
                <p><strong>📝 Journal:</strong> {entry.journal || "None"}</p>
                <p><strong>😊 Mood Score:</strong> {entry.mood || "Not set"}</p>
                
                {/* Add edit button */}
                <button
                  onClick={() => loadEntryForEdit(entry.date)}
                  className="mt-3 text-sm text-blue-500 hover:underline"
                >
                  ✏️ Edit this day
                </button>
              </div>
            </details>
          ))}
        </div>
      )}

      {viewMode === "calendar" && (
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <h2 className="text-lg font-bold">📅 Monthly Overview</h2>
          
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-gray-100"
            >
              ◀️ Prev
            </button>
            
            <p className="text-gray-600 text-center font-medium">
              {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            
            <button 
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-gray-100"
            >
              Next ▶️
            </button>
          </div>
          
          <button 
            onClick={goToCurrentMonth}
            className="text-sm text-blue-500 hover:underline mx-auto block"
          >
            Today
          </button>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mt-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center font-medium text-sm text-gray-600">
                {day}
              </div>
            ))}
            
            {generateCalendarDays().map((day, index) => (
              <div 
                key={index}
                className={`aspect-square rounded border p-1 relative ${
                  day.empty ? "bg-gray-50" : 
                  day.date === dateInput ? "bg-blue-100 border-blue-500" : ""
                }`}
                onClick={() => {
                  if (!day.empty) {
                    if (day.hasEntry) {
                      loadEntryForEdit(day.date);
                    } else {
                      setDateInput(day.date);
                      resetForm();
                      setDone(false);
                      setViewMode("daily");
                    }
                  }
                }}
                title={day.hasEntry ? 
                  `${day.date} - ${day.isCheckedIn ? `Mood: ${day.mood}/5` : "Not checked in yet"}` : 
                  day.empty ? "" : `${day.date} - No entry yet`}
              >
                {!day.empty && (
                  <>
                    <div className="text-right text-sm">{day.day}</div>
                    {day.hasEntry && (
                      <div className="flex justify-center mt-1">
                        <div className={`h-2 w-2 rounded-full ${
                          day.isCheckedIn ? 
                            day.mood >= 4 ? "bg-green-500" : 
                            day.mood >= 3 ? "bg-yellow-500" : 
                            "bg-red-500" : 
                          "bg-blue-300"
                        }`}></div>
                      </div>
                    )}
                    {/* Show tasks count for all entries with tasks */}
                    {day.hasEntry && day.numberOfTasks > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-600">
                        {day.tasksCompleted}/{day.numberOfTasks}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-300 mr-1"></div>
              <span>Planned</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
              <span>Happy</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
              <span>Neutral</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
              <span>Unhappy</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-4 pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          <span className="inline-block"></span>
          <img 
            src="https://api.visitorbadge.io/api/visitors?path=Fionayjx.tiny-wins&countColor=%23263759&labelColor=transparent&countBackground=transparent" 
            alt="Visitor Counter"
            width="60" 
            className="inline-block align-middle -mt-[2px] opacity-30"
          />
        </p>
      </div>
    </div>
  );
}
