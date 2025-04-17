import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { BiMap, BiSolidChevronUpSquare, BiSolidLeftDownArrowCircle } from "react-icons/bi";
import { NavLink } from 'react-router-dom';
import { SlActionRedo } from "react-icons/sl";
import { FcInfo } from "react-icons/fc";
import { BiRevision } from "react-icons/bi"
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux';
import InputGroup from '../../components/InputGroup/InputGroup'
import { fetchDrivers } from '../../features/drivers/driverSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Location = () => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus, addStatus, deleteStatus, error } = useSelector((state) => state.drivers);
    const [filteredDrivers, setFilteredDrivers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOption, setFilterOption] = useState('all');
    const [showFilterOptions, setShowFilterOptions] = useState(false);

    const [locations, setLocations] = useState({});
    const [locationStatus, setLocationStatus] = useState({});
    const [address, setAddress] = useState({});
    const [pendingReq, setPendingReq] = useState({});
    const [activeMarker, setActiveMarker] = useState(null);
    const [locationSetter, setLocationSetter] = useState(null);

    const [refreshing, setRefreshing] = useState(false);

    const mapRef = useRef();

    useEffect(() => {
        if (driverStatus === 'idle') {
            dispatch(fetchDrivers());
            setFilteredDrivers(drivers)
        }

    }, [driverStatus, dispatch]);


    useEffect(() => {
        setActiveMarker(null)
        setFilteredDrivers(
            drivers.filter(driver =>
                `${driver.firstName} ${driver.lastName}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            )
        );
    }, [searchQuery, drivers]);

    const getAddress = async (lat, lon) => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        try {
            const response = await axios.get(url);
            const address = response.data.display_name;
            return address
        } catch (error) {
            console.error("Error fetching address:", error);
        }
    };

    const locationFetchOnMount = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/applocation/get-location`, { params: { user_ID: drivers.map((driver) => driver.user_ID) } });
            const data = response.data;
            data.map(async (data) => {
                const timestamp = new Date(data.currentLocation.timestamp);
                const now = Date.now();
                const fiveMinAgo = now - 300 * 1000;
                const oneHourAgo = now - 3600 * 1000;

                if (timestamp >= fiveMinAgo) {
                    setLocationStatus((prev) => ({ ...prev, [data.user_ID]: 'fresh' }));
                }
                else if (timestamp <= fiveMinAgo && timestamp >= oneHourAgo) {
                    setLocationStatus((prev) => ({ ...prev, [data.user_ID]: 'stale' }));
                }
                else {
                    setLocationStatus((prev) => ({ ...prev, [data.user_ID]: 'old' }));
                }
                setLocations((prev) => ({ ...prev, [data.user_ID]: data.currentLocation }));
                let fetchedAddress;
                setTimeout(async () => { fetchedAddress = await getAddress(data.currentLocation.latitude, data.currentLocation.longitude); setAddress((prev) => ({ ...prev, [data.user_ID]: fetchedAddress })) }, 1100)

                if (data.locationRequest == 'pending') {
                    setPendingReq((prev) => ({ ...prev, [data.user_ID]: 'pending' }))
                }

                setTimeout(() => setRefreshing(false), 500);
            })
        }
        catch (error) {
            console.error('error fetching location data')
        }
    };

    useEffect(() => {
        locationFetchOnMount()
        setInterval(() => locationFetchOnMount(), 60000)
    }, [drivers])

    const handleGetLocation = async (user_ID) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/applocation/${user_ID}`);
            const data = response.data;

            if (response.status == 200) {
                setLocations((prev) => ({ ...prev, [user_ID]: data.currentLocation }));
                setLocationSetter(user_ID)
                setTimeout(() => setLocationSetter(null), 500)
            } else {
                setActiveMarker(null)
            }
        } catch (error) {
            alert('An error occurred while fetching the location.');
        }
    };

    const customMarkerIcon = new L.DivIcon({
        html: `<div class="w-[25px] h-[41px] bg-[url('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png')] bg-cover transition-all duration-200 origin-[center_bottom] hover:scale-[1.6]"></div>`,
        className: '',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    const activeMarkerIcon = new L.DivIcon({
        html: `<div class="w-[25px] h-[41px] bg-[url('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png')] bg-cover  origin-[center_bottom] animate-wiggle "></div>`,
        className: '',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

    const CenterMap = ({ location }) => {
        const map = useMap();
        useEffect(() => {
            if (location) {
                map.flyTo([location.latitude, location.longitude], 15, {
                    animate: true,
                });
            }
        }, [locationSetter]);
        return null;
    };

    let holdTimeout;
    const wiggleMarker = (user_ID) => {
        setActiveMarker(user_ID)
        setTimeout(() => setActiveMarker(null), 500)
    }

    const startHold = (user_ID) => {
        holdTimeout = setTimeout(() => {
            handleGetLocation(user_ID);
        }, 1000);
    };

    const endHold = () => {
        clearTimeout(holdTimeout);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 p-1 md:p-3 gap-5">
            {/* Map Column */}
            <div className="flex-1 md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
                <MapContainer
                    center={[54.505, -0.09]}
                    zoom={6}
                    className="w-full h-[550px] rounded-xl z-0"
                    scrollWheelZoom={false}
                    whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <CenterMap location={locations[locationSetter]} />
                    {Object.entries(locations).map(([user_ID, location]) => {
                        return (
                            <Marker
                                key={user_ID}
                                position={[location.latitude, location.longitude]}
                                icon={user_ID === activeMarker ? activeMarkerIcon : customMarkerIcon}
                            >
                                <Popup>
                                    <NavLink to='/manage-drivers' state={user_ID}>
                                        <p className="flex items-center gap-1">
                                            Personnel ID: {user_ID}
                                            <SlActionRedo />
                                        </p>
                                    </NavLink>
                                    <p>Timestamp: {new Date(location.timestamp).toLocaleString()}</p>
                                    {address[user_ID] ? (
                                        <p>Address: {address[user_ID]}</p>
                                    ) : (
                                        <p>Address: Loading...</p>
                                    )}
                                    <a
                                        target="_blank"
                                        href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                                        className="text-blue-500 hover:underline"
                                    >
                                        Open in google maps
                                    </a>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>

            {/* Table Column */}
            <div className="flex-[0.5] overflow-auto bg-white border border-gray-200 rounded-xl shadow-md px-2 py-4">
                <div className="flex items-center justify-between mb-4 flex-nowrap gap-2">
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => {
                                setRefreshing(true);
                                locationFetchOnMount()
                            }}
                            className={`bg-gray-100 rounded-full p-3 flex items-center justify-center w-12 h-12 transition-colors hover:bg-gray-200 ${refreshing ? 'animate-[rotate_0.5s_ease-in-out]' : ''}`}
                        >
                            <BiRevision size={18} />
                        </button>
                        <InputGroup
                            type="text"
                            placeholder="Search driver's name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='!m-0'
                        />
                    </div>

                    <div className="relative">
                        <button
                            className="bg-primary-500 text-white px-2 p-1 rounded-lg text-sm"
                            onClick={() => setShowFilterOptions(!showFilterOptions)}
                        >
                            Filter <span>▼</span>
                        </button>
                        {showFilterOptions && (
                            <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-md p-3 z-50">
                                <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        name="filter"
                                        value="all"
                                        checked={filterOption === 'all'}
                                        onChange={(e) => {
                                            setFilterOption(e.target.value);
                                            setShowFilterOptions(!showFilterOptions)
                                        }}
                                    />
                                    All
                                </label>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        name="filter"
                                        value="fresh"
                                        checked={filterOption === 'fresh'}
                                        onChange={(e) => {
                                            setFilterOption(e.target.value);
                                            setShowFilterOptions(!showFilterOptions)
                                        }}
                                    />
                                    Location Available<BiMap className="text-green-500" />
                                </label>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        name="filter"
                                        value="old"
                                        checked={filterOption === 'old'}
                                        onChange={(e) => {
                                            setFilterOption(e.target.value);
                                            setShowFilterOptions(!showFilterOptions)
                                        }}
                                    />
                                    Location Unavailable<BiMap className="text-red-500" />
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        name="filter"
                                        value="stale"
                                        checked={filterOption === 'stale'}
                                        onChange={(e) => {
                                            setFilterOption(e.target.value);
                                            setShowFilterOptions(!showFilterOptions)
                                        }}
                                    />
                                    Stale Location <BiMap className="text-yellow-300" />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-h-[445px] rounded-md overflow-visible scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-primary-500 text-white sticky top-0 z-10">
                            <tr>
                                <th className="p-2 text-center">Personnel ID</th>
                                <th className="p-2 text-center">Personnel Name</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.filter((user) => {
                                if (filterOption === 'all') return true;
                                const status = locationStatus[user.user_ID];

                                if (filterOption === 'fresh') {
                                    return status === 'fresh';
                                } else if (filterOption === 'stale') {
                                    return status === 'stale';
                                } else if (filterOption === 'old') {
                                    return status !== 'fresh' && status !== 'stale';
                                }
                                return false;
                            }).map((user) => (
                                <tr key={user.user_ID} className="hover:bg-blue-50">
                                    <td className="p-2 text-center">{user.user_ID}</td>
                                    <td className="p-2 text-center">{user.firstName + ' ' + user.lastName + ' '}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex justify-around items-center">
                                            <button
                                                className="text-lg transition-transform hover:scale-125"
                                                onMouseDown={() => startHold(user.user_ID)}
                                                onMouseUp={() => endHold()}
                                                onClick={() => wiggleMarker(user.user_ID)}
                                                style={{
                                                    color: locationStatus[user.user_ID] == 'fresh' ? 'green' :
                                                        locationStatus[user.user_ID] === 'stale' ? '#f0e68c' : 'red'
                                                }}
                                            >
                                                <BiMap size={18} />
                                            </button>
                                            <div className="relative  cursor-pointer group">
                                                <div className="z-10 absolute left-1/2 -top-18 text-white -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md p-2 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
                                                    Last Updated: {new Date(locations[user.user_ID]?.timestamp).toLocaleString()}
                                                </div>

                                                <FcInfo size={18} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Location;