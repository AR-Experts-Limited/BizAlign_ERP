import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';

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
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
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
                        </table>
                    </div>
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="NINO Document"
                        name="ninoDocument"
                        onChange={(e) => onInputChange(e)}
                    />
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
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
                        </table>
                    </div>
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Signature"
                        name="signature"
                        onChange={(e) => onInputChange(e)}
                    />
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
                                <tr>
                                    <th colSpan={3}>
                                        History of Signatures
                                    </th>
                                </tr>
                                <tr>
                                    <th>Version</th>
                                    <th>Actions</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsTab;