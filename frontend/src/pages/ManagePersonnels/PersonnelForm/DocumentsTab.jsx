import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'

const DocumentsTab = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Documents</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Profile Picture"
                        name="profilePicture"
                        onChange={(e) => onInputChange(e)}
                    />
                    {newDriver.profilePictureArray?.length > 0 &&
                        <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                            <table className='table-general'>
                                <thead className='sticky top-0 bg-white'>
                                    <tr>
                                        <th colSpan={3}>
                                            History of Profile Picture
                                        </th>
                                    </tr>
                                    <tr>
                                        <th>Version</th>
                                        <th>Actions</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(newDriver.profilePictureArray || [])
                                        .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                            <tr>
                                                <td>{newDriver.profilePictureArray.length - index}</td>
                                                <td>
                                                    <div className='flex justify-around'>
                                                        <div onClick={() => handleFileView(doc.original)}
                                                            className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                    </div>
                                                </td>
                                                <td>{new Date(doc.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>}
                </div>

                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="NINO Document"
                        name="ninoDocument"
                        onChange={(e) => onInputChange(e)}
                    />
                    {newDriver.ninoDocumentArray?.length > 0 &&
                        <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                            <table className='table-general'>
                                <thead className='sticky top-0 bg-white'>
                                    <tr>
                                        <th colSpan={3}>
                                            History of NINO Document
                                        </th>
                                    </tr>
                                    <tr>
                                        <th>Version</th>
                                        <th>Actions</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(newDriver.ninoDocumentArray || [])
                                        .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                            <tr>
                                                <td>{newDriver.ninoDocumentArray.length - index}</td>
                                                <td>
                                                    <div className='flex justify-around'>
                                                        <div onClick={() => handleFileView(doc.original)}
                                                            className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                    </div>
                                                </td>
                                                <td>{new Date(doc.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>}
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Signature"
                        name="signature"
                        onChange={(e) => onInputChange(e)}
                    />
                    {newDriver.signatureArray?.length > 0 &&
                        <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                            <table className='table-general'>
                                <thead className='sticky top-0 bg-white'>
                                    <tr>
                                        <th colSpan={3}>
                                            History of Signature
                                        </th>
                                    </tr>
                                    <tr>
                                        <th>Version</th>
                                        <th>Actions</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(newDriver.signatureArray || [])
                                        .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                            <tr>
                                                <td>{newDriver.signatureArray.length - index}</td>
                                                <td>
                                                    <div className='flex justify-around'>
                                                        <div onClick={() => handleFileView(doc.original)}
                                                            className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                    </div>
                                                </td>
                                                <td>{new Date(doc.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>}
                </div>
            </div>
        </div >
    );
};

export default DocumentsTab;