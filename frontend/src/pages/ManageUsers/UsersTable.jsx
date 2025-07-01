import { FaTrashAlt } from "react-icons/fa";

export const UsersTable = ({ allUsers, handleEditUser, initiateDeleteUser, canEditUser }) => {
    return (
        <div className='overflow-auto'>
            <table className='table-general'>
                <thead>
                    <th>#</th>
                    <th>User name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Options</th>
                </thead>
                <tbody>
                    {allUsers.filter((user) => user.role !== 'Driver').map((user, index) => (
                        <tr onClick={() => { if ((index === 0 && user.role === 'super-admin') || canEditUser(user)) { handleEditUser(user) } }} className={`${index === 0 && 'bg-amber-50 text-amber-500'} cursor-pointer hover:bg-neutral-50`} >
                            <td>{index + 1}</td>
                            <td>{user?.firstName + ' ' + user?.lastName}</td>
                            <td>{user?.email}</td>
                            <td>{user?.role}</td>
                            <td >
                                <div className='flex justify-center'>
                                    <div onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEditUser(user)) {
                                            initiateDeleteUser(user)
                                        }
                                    }}
                                        className={`flex justify-center items-center w-7 h-7   rounded-md p-1 hover:bg-neutral-200 ${canEditUser(user) ? 'text-red-500' : ' text-gray-400'}`}><FaTrashAlt size={16} /></div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    )
}