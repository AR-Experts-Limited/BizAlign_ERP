import React, { useEffect, useState } from 'react';
import { FaUserClock } from 'react-icons/fa';
import axios from 'axios';
import moment from 'moment';

const formatOverdueTime = (minutes) => {
    const duration = moment.duration(minutes, 'minutes');
    const hours = Math.floor(duration.asHours());
    const mins = duration.minutes();

    if (minutes < 60) {
        return `${mins} min`;
    } else if (mins === 0) {
        return `${hours} hr`;
    } else {
        return `${hours} hr ${mins} min`;
    }
};

const API_BASE_URL = import.meta.env.VITE_API_URL;

const OverdueShiftBubble = ({ userSite }) => {
    const [showList, setShowList] = useState(true);
    const [overdueDrivers, setOverdueDrivers] = useState([]);
    const [showStickyBanner, setShowStickyBanner] = useState(false);

    const site = userSite || JSON.parse(localStorage.getItem('currentUser'))?.site;

    const fetchOverdueDrivers = async () => {
        if (!site) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/overdue-drivers?site=${site}`);
            const data = await res.json();
            setOverdueDrivers(data);
            setShowStickyBanner(data.length > 0);
        } catch (err) {
            console.error('Failed to fetch overdue drivers:', err);
        }
    };

    useEffect(() => {
        fetchOverdueDrivers();
        const interval = setInterval(fetchOverdueDrivers, 60000);
        return () => clearInterval(interval);
    }, [site]);

    if (!overdueDrivers.length) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[1000]">
            {showStickyBanner && (
                <div className="fixed top-13 left-0 right-0 w-1/2 mx-auto rounded-full z-[9999] py-3 px-6 font-medium text-center bg-red-500/50 backdrop-blur-sm text-white shadow-lg border-b border-black/5 text-lg tracking-wide transition-all duration-300">
                    ⚠️ This is a reminder that there are Personnel yet to End their Shift for today.
                </div>
            )}

            {showList && (
                <div className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-lg p-3 w-60 shadow-md text-sm max-h-[300px] overflow-y-auto">
                    <strong className="block text-center font-semibold text-base mb-2">Overdue Personnel</strong>
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                <th className="p-2 text-left bg-gray-100 font-semibold">Photo</th>
                                <th className="p-2 text-left bg-gray-100 font-semibold">Name</th>
                                <th className="p-2 text-left bg-gray-100 font-semibold">Overdue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdueDrivers.map((d, idx) => (
                                <tr key={idx}>
                                    <td className="p-2 align-middle">
                                        <img
                                            src={
                                                Array.isArray(d.profilePicture) && d.profilePicture.length > 0
                                                    ? d.profilePicture.sort((a, b) => new Date(b) - new Date(a))[0].original
                                                    : '/defaultProfile.png'
                                            }
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                        />
                                    </td>
                                    <td className="p-2 align-middle">
                                        <div className="font-medium">{d.name}</div>
                                        <div className="text-xs text-gray-500">ID: {d.user_ID}</div>
                                    </td>
                                    <td className="p-2 align-middle">{formatOverdueTime(d.overdueByMinutes)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OverdueShiftBubble;