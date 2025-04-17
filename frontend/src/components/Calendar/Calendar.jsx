import React,{ useEffect, useState } from 'react'
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css'

function getStartOfISOWeek(isoWeek) {

    const [year, week] = isoWeek.split('-W').map(Number);
  
    
    const janFirst = new Date(year, 0, 1); 
    const dayOfWeek = janFirst.getDay(); 
    const daysToAdd = (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek) + (week - 1) * 7; 
    janFirst.setDate(janFirst.getDate() + daysToAdd);
  
  
    return janFirst;
  }

function CalendarCustom({timeFrame, selectedWeek, setSelectedWeek, setDynamicTimeFrame, onChange}) {
    const [selectedDate, setSelectedDate] = useState((selectedWeek)?getStartOfISOWeek(selectedWeek):new Date());
    const [selectedWeekCal, setSelectedWeekCal] = useState(null);
    

    const getWeekRange = (date) => {
        const endSelector = timeFrame=='weekly' ? 6 : 13
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + endSelector); // Saturday
        return { startOfWeek, endOfWeek };
      };
    
      const getISOWeekString = (date) => {
        const tempDate = new Date(date);
        
        const yearStart = new Date(tempDate.getFullYear(), 0, 1);
        

        const sundayOfYearStart = new Date(yearStart);
        sundayOfYearStart.setDate(yearStart.getDate() - yearStart.getDay()); // Adjust to Sunday
        
        const diffDays = Math.floor((tempDate - sundayOfYearStart) / (1000 * 60 * 60 * 24));
        
        var weekNo = Math.ceil(diffDays / 7) + 1;
        var year = tempDate.getFullYear();

        if(weekNo>52){
            year+=1
            weekNo=1
          }
      
        return `${year}-W${weekNo.toString().padStart(2, '0')}`;
      };
      

      useEffect(() =>{
        const { startOfWeek, endOfWeek } = getWeekRange(selectedDate);
        setSelectedWeekCal({ start: startOfWeek, end: endOfWeek });
    },[selectedDate])

      const handleDateChange = (date) => {
        setSelectedDate(date);
        const { startOfWeek, endOfWeek } = getWeekRange(date);
        const isoWeek = getISOWeekString(startOfWeek);
        setSelectedWeek(isoWeek)
        if (setDynamicTimeFrame) {
          setDynamicTimeFrame({ startDay: startOfWeek, endDay: endOfWeek });
        }
        setSelectedWeekCal({ start: startOfWeek, end: endOfWeek });
        if (onChange) {
          onChange(isoWeek); // Pass the week value to the onChange callback
        }
      };
    
      const isDateFirstOrLastOfWeek = (date) => {
        if (!selectedWeekCal) return false;
        const isFirst = date.toDateString() === selectedWeekCal.start.toDateString();
        const isLast = date.toDateString() === selectedWeekCal.end.toDateString();
        return { isFirst, isLast };
      };
    
      const isDateInSelectedWeekCal = (date) => {
        if (!selectedWeekCal) return false;
        return date >= selectedWeekCal.start && date <= selectedWeekCal.end;
      };
    
  return (
    <div><Calendar
            className={'calendar'}
                locale='en-US'
                showWeekNumbers={true}
                view="day"
            value={selectedDate}
            onChange={handleDateChange}
            tileClassName={({ date }) => {
            const { isFirst, isLast } = isDateFirstOrLastOfWeek(date);
            if (isFirst) return 'highlight-week-first';
            if (isLast) return 'highlight-week-last';
            return isDateInSelectedWeekCal(date) ? 'highlight-week' : '';
            }}/>
    </div>
  )
}

export default CalendarCustom