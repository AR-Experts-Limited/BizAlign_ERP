import React, { useEffect, useState, useRef } from 'react'
import CalendarCustom from './Calendar';


const WeekFilter = ({ value, onChange, styleCustom, disabled }) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef(null);
  const [selectedWeek, setSelectedWeek] = useState(value)

  const handleInputBlur = (e) => {

    if (
      calendarRef.current &&
      calendarRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    setShowCalendar(false);
  };
  useEffect(() => {
    if (selectedWeek) {
      setShowCalendar(false);
    }
  }, [selectedWeek]);

  return (<div style={{ position: 'relative', display: 'inline-block', ...styleCustom }} >

    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>

      <input
        type="text"
        value={value}
        onClick={() => setShowCalendar(true)}
        onBlur={handleInputBlur}
        placeholder="Select Week"
        style={{ cursor: 'pointer', paddingRight: '10px', width: '100%' }}
        disabled={disabled || false}
        required
      />

      {/* Clear Button */}
      {selectedWeek && (
        <button
          onClick={() => {
            if (onChange) onChange('')
            setSelectedWeek('')
          }}
          style={{
            position: 'absolute',
            right: '5px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#999'
          }}
          aria-label="Clear"
        >
          &times;
        </button>
      )}
    </div>

    {/* Calendar */}
    {showCalendar && (
      <div
        ref={calendarRef}
        onMouseDown={() => setShowCalendar(true)}
        style={{ position: 'absolute', zIndex: 1000 }}
      >
        <CalendarCustom
          timeFrame={'weekly'}
          selectedWeek={value}
          setSelectedWeek={setSelectedWeek}
          onChange={onChange}
        />
      </div>
    )}
  </div>)

}

export default WeekFilter