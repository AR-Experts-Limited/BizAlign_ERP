import React from 'react';
import './PrivacyPolicy.css'
import LineGradient from '../LineGradient.jsx';
import { Navigate, useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
    const navigate = useNavigate();
  return (
    <div className='privacy-page'>
       
    
    <div className="privacy-container">
      <h1 className="privacy-title">Privacy Policy</h1>

      <div className='privacy-header'>
        <p><strong>Effective Date:</strong> 10/02/2025</p>
        <p><strong>Last Updated:</strong> 10/02/2025</p>
      </div>

      <div className="privacy-content">
        <div className='privacy-card'>
          <p>
            AR Experts Ltd ("we," "us," or "our"), registered at Centenary House, 1 Centenary Way, Salford, England, M50 1RF, trading as BIZALIGN, operates a CRM platform that connects with mobile devices and other digital services. This Privacy Policy outlines how we collect, use, protect, and manage personal data in compliance with UK GDPR, Data Protection Act 2018, and other relevant UK regulations.
          </p>
        </div>

        <div className='privacy-card'>
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy applies to all users of the BIZALIGN platform, including website visitors, mobile app users, and customers who interact with our services. It explains how we handle personal data, the rights of users, and the measures we take to ensure data security and compliance with UK laws.
          </p>
          <p>
            BIZALIGN is a Customer Relationship Management (CRM) platform designed to help businesses manage their customer interactions, sales processes, and marketing activities. The platform integrates with mobile devices, third-party services, and other digital tools to provide a seamless experience for users.
          </p>
        </div>

        <div className='privacy-card'>
          <h2>2. Information We Collect</h2>
          <p>
            We collect various types of information to provide and improve our services. The data we collect can be categorized as follows:
          </p>

          <h3>2.1 Personal Information</h3>
          <ul>
            <li><strong>Name, Email Address, Phone Number:</strong> Collected during account registration and profile updates.</li>
            <li><strong>Company Details:</strong> Including company name, address, and industry sector.</li>
            <li><strong>Title and Role:</strong> To tailor the platform experience to your professional needs.</li>
          </ul>

          <h3>2.2 Financial Information</h3>
          <ul>
            <li><strong>Payment Details:</strong> Bank Account details, and billing addresses for processing payments.</li>
            <li><strong>Invoicing Data:</strong> Transaction history, invoices, and payment receipts.</li>
          </ul>

          <h3>2.3 Technical Data</h3>
          <ul>
            <li><strong>Device Information:</strong> Including device type, operating system, and unique device identifiers.</li>
            <li><strong>IP Address:</strong> Collected for security and analytics purposes.</li>
            <li><strong>Browser Type and Version:</strong> To ensure compatibility and optimize user experience.</li>
            <li><strong>Usage Logs:</strong> Information about how you interact with the platform, including pages visited, features used, and time spent on the platform.</li>
          </ul>

          <h3>2.4 Location Data</h3>
          <ul>
            <li><strong>Geolocation Data:</strong> Collected via app settings or user input to provide location-based services.</li>
          </ul>

          <h3>2.5 Sensitive Information</h3>
          <ul>
            <li><strong>Tax Data:</strong> Including VAT numbers and other tax-related information for compliance purposes.</li>
            <li><strong>Identity Verification Documents:</strong> Such as passports or driver's licenses, where legally required for KYC (Know Your Customer) processes.</li>
          </ul>
        </div>

        <div className='privacy-card'>
          <h2>3. How We Collect Information</h2>
          <p>
            We gather information through various methods, including:
          </p>

          <h3>3.1 Direct Input</h3>
          <ul>
            <li><strong>Registration Forms:</strong> When you create an account on BIZALIGN.</li>
            <li><strong>Profile Updates:</strong> When you update your personal or company information.</li>
            <li><strong>User Interactions:</strong> Such as filling out forms, submitting queries, or participating in surveys, uploading Photos, documents.</li>
          </ul>

          <h3>3.2 Automated Technologies</h3>
          <ul>
            <li><strong>Cookies:</strong> Small text files stored on your device to enhance user experience and track site usage.</li>
            <li><strong>Log Files:</strong> Automatically collected data about your interactions with the platform.</li>
          </ul>

          <h3>3.3 Third-Party Integrations</h3>
          <ul>
            <li><strong>Payment Gateways:</strong> APIs connecting third-party services such as payment gateways.</li>
            <li><strong>APIs:</strong> Connecting third-party services like email marketing tools, CRM integrations, and other business applications.</li>
          </ul>
        </div>

        <div className='privacy-card'>
          <h2>4. Use of Information</h2>
          <p>
            We use the collected information for the following purposes:
          </p>

          <h3>4.1 Providing Services</h3>
          <ul>
            <li><strong>Account Setup and Management:</strong> To create and manage user accounts.</li>
            <li><strong>Platform Functionality:</strong> To ensure the platform operates smoothly and efficiently.</li>
            <li><strong>Customer Support:</strong> To assist users with any issues or queries.</li>
          </ul>

          <h3>4.2 Compliance & Legal Obligations</h3>
          <ul>
            <li><strong>Regulatory Compliance:</strong> To meet obligations under UK GDPR and other relevant laws.</li>
          </ul>

          <h3>4.3 Security</h3>
          <ul>
            <li><strong>Data Integrity:</strong> To protect against unauthorized access, data breaches, and other security threats.</li>
            <li><strong>Fraud Prevention:</strong> To detect and prevent fraudulent activities.</li>
          </ul>

          <h3>4.4 Communication</h3>
          <ul>
            <li><strong>Product Updates:</strong> To inform users about new features, updates, and improvements.</li>
            <li><strong>Newsletters:</strong> To share industry news, tips, and promotional offers.</li>
            <li><strong>Critical Notifications:</strong> To alert users about important changes or security issues.</li>
          </ul>

          <p><strong>We do not sell or trade your personal data to third parties for marketing purposes.</strong></p>
        </div>

        <div className='privacy-card'>
          <h2>5. Sharing and Disclosure of Information</h2>
          <p>
            We only share data as necessary for the following purposes:
          </p>

          <h3>5.1 Cloud Storage Providers</h3>
          <ul>
            <li><strong>Amazon Web Services (AWS):</strong> For secure cloud-based data storage.</li>
          </ul>

          <h3>5.2 Database Management</h3>
          <ul>
            <li><strong>MongoDB:</strong> For structured storage and efficient data retrieval.</li>
          </ul>

          <h3>5.3 Third-Party Analytics</h3>
          <ul>
            <li><strong>Firebase:</strong> For analytics and push notifications to improve user engagement.</li>
          </ul>

          <h3>5.4 Legal Compliance</h3>
          <ul>
            <li><strong>Government Authorities:</strong> Where required by law, such as in response to a court order or regulatory request.</li>
          </ul>
        </div>

        <div className='privacy-card'>
          <h2>6. Data Security</h2>
          <p>
            We implement robust security measures to protect your personal data:
          </p>

          <h3>6.1 Encryption</h3>
          <ul>
            <li><strong>Data in Transit:</strong> All sensitive data is encrypted during transmission using SSL/TLS protocols.</li>
            <li><strong>Data at Rest:</strong> Sensitive data stored in our databases (MongoDB) is encrypted using AES-256 encryption. Also, Backup data is stored in local hard drive.</li>
          </ul>

          <h3>6.2 Access Control</h3>
          <ul>
            <li><strong>Role-Based Access:</strong> Data access is restricted based on user roles and responsibilities.</li>
            <li><strong>Multi-Factor Authentication (MFA):</strong> To add an extra layer of security for account access.</li>
          </ul>

          <h3>6.3 Monitoring</h3>
          <ul>
            <li><strong>Regular Audits:</strong> We conduct regular system audits to identify and address vulnerabilities.</li>
            <li><strong>Incident Response:</strong> We have a dedicated incident response team to handle data breaches and security incidents.</li>
          </ul>
        </div>

        <div className='privacy-card'>
          <h2>7. Data Retention</h2>
          <p>
            We retain personal data for <strong>6 years</strong>, as per legal and regulatory requirements. Data is securely deleted afterward unless further retention is necessary for legal reasons.
          </p>
        </div>

        <div className='privacy-card'>
          <h2>8. Your Rights</h2>
          <p>
            Under UK law, you have the right to:
          </p>
          <ul>
            <li><strong>Access and Correct:</strong> Request access to personal data and correct inaccuracies.</li>
            <li><strong>Erasure:</strong> Request deletion of personal data, subject to legal obligations.</li>
            <li><strong>Data Portability:</strong> Receive personal data in a structured format.</li>
            <li><strong>Object to Processing:</strong> Oppose processing where applicable.</li>
          </ul>
          <p>
            To exercise these rights, contact <strong>admin@bizalign.co.uk</strong>
          </p>
        </div>

        <div className='privacy-card'>
          <h2>9. Cookie Policy</h2>
          <p>
            We use cookies to:
          </p>
          <ul>
            <li>Improve user experience.</li>
            <li>Track site usage through analytics tools.</li>
            <li>Personalise content.</li>
          </ul>
          <p>
            Users can manage cookie preferences through their browser settings or via our cookie consent banner.
          </p>
        </div>

        <div className='privacy-card'>
          <h2>10. Legal Basis for Processing</h2>
          <p>
            We process personal data based on:
          </p>
          <ul>
            <li><strong>Contractual Necessity:</strong> Providing requested services.</li>
            <li><strong>Legal Obligation:</strong> Compliance with applicable laws.</li>
            <li><strong>Legitimate Interest:</strong> Improving services and ensuring security.</li>
            <li><strong>Consent:</strong> When required, such as for marketing purposes.</li>
          </ul>
        </div>

        <div className='privacy-card'>
          <h2>11. Data Breach Notification</h2>
          <p>
            In the event of a data breach, we will:
          </p>
          <ul>
            <li>Notify affected users and the ICO (Information Commissioner's Office) within 72 hours, as required by law.</li>
          </ul>
        </div>
        <div className='privacy-card'>
          <h2>12. Changes to this Privacy Policy</h2>
          <p>
            We may update this policy periodically. Updates will be posted on our website, and significant changes will be communicated via email. It will be also updated on our website and on our app store database.
          </p>
        </div>

        <div className='privacy-card'>
          <h2>13. Children's Privacy</h2>
            <p>
              Our platform is not intended for users under the age of 16. We do not knowingly collect personal data from children.
            </p>
          </div>
          <div className='privacy-card'>
          <h2>14. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites.
          </p>
        </div>
        <div className='privacy-card'>
          <h2>15. Contact Information</h2>
          <p>
            For any privacy-related questions or concerns, contact us at:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:admin@bizalign.co.uk">admin@bizalign.co.uk</a><br />
            <strong>Address:</strong> Centenary House, 1 Centenary Way, Salford, England, M50 1RF<br />
            <strong>ICO Registration Number:</strong> ZB827459
          </p>
        </div>
        <div className='privacy-card'>
          <p>
            This policy ensures compliance with UK GDPR and other data protection regulations, safeguarding user rights and business obligations effectively.
          </p>
        </div>
      </div>
    </div>  
    </div>
  );
};

export default PrivacyPolicy;