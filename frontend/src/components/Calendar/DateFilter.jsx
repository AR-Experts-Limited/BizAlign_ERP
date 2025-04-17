import React, { useEffect, useState, useRef } from 'react'
import Calendar from 'react-calendar';
import { BiNoEntry } from 'react-icons/bi';


const DateFilter = ({ value, onChange, styleInput, styleCal, required }) => {
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState('')

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
    if (selectedDate) {
      setShowCalendar(false);
    }
  }, [selectedDate]);

  return (<div style={{ position: 'relative', ...styleInput }} >

    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>

      <input
        type="text"
        value={value ? (new Date(value).toLocaleDateString()) : ""}
        onClick={() => setShowCalendar(true)}
        onBlur={handleInputBlur}
        placeholder="Select Date"
        style={{ position: 'relative', cursor: 'pointer', paddingRight: '10px', width: '95%' }}
        required={required}
      />

      {/* Clear Button */}
      {selectedDate && (
        <button
          onClick={() => {
            if (onChange) onChange('')
            setSelectedDate('')
          }}
          style={{
            position: 'absolute',
            right: '1.5rem',
            top: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            margin: '0',
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
        style={{ position: 'absolute', zIndex: 1000, ...styleCal }}
      >
        <Calendar
          value={selectedDate}
          onChange={(date) => {
            setSelectedDate(date);
            onChange(date);
          }}
          locale='en-US'
          className="calendar" view='day' />
      </div>
    )}
  </div>)

}

export default DateFilter