import React from 'react';
import './LandingPage.scss';
import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from 'react-hook-form';
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { motion, useInView } from "framer-motion";


const features = [
  {
    title: "User Access Control",
    description: "Simplify User Administration with an intuitive interface.",
    image: "/feature-img/feature1.png",
  },

  {
    title: "Smart Planner",
    description: "Organise schedules efficiently and stay ahead with the planning tools.",
    image: "/feature-img/feature3.png",
  },
  {
    title: "Dynamic Pricing",
    description: "Customize and adjust pricing structures to fit business needs with ease.",
    image: "/feature-img/feature2.png",
  },
  {
    title: "Instant Alerts",
    description: "Receive timely notifications to stay updated on important updates.",
    image: "/feature-img/feature4.png",
  },
  {
    title: "Real-Time Insights",
    description: "Monitor ongoing activities with live tracking and data visualization.",
    image: "/feature-img/feature5.png",
  },

];

function LandingPage() {
  const navigate = useNavigate();
  const featuresRef = useRef(null);
  const titleRef = useRef(null);
  const downloadRef = useRef(null);
  const isdownloadInView = useInView(downloadRef, { threshold: 0.4 });
  const googleRef = useRef(null);
  const isGoogleInView = useInView(googleRef, { threshold: 0.4 });
  const appleRef = useRef(null);
  const isAppleInView = useInView(appleRef, { threshold: 0.4 });
  const isTitleInView = useInView(titleRef, { threshold: 0.4 });
  const [scaleValue, setScaleValue] = useState(0.75);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [showHeroGif, setShowHeroGif] = useState(true);
  const [showHeroContent, setShowHeroContent] = useState(false);

  const {
    register,
    trigger,
    formState: { errors },
  } = useForm();


  useEffect(() => {
    const gifTimer = setTimeout(() => {
      setShowHeroGif(false);        // Hide GIF and show SVG
      setShowHeroContent(true);     // Begin fading in the rest of the hero content
    }, 2500); // Duration of GIF in ms

    return () => clearTimeout(gifTimer);
  }, []);


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };


    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);

  }, []);



  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;

        if (ratio >= 0.9) setScaleValue(1);
        else if (ratio >= 0.7) setScaleValue(0.95);
        else if (ratio >= 0.5) setScaleValue(0.9);
        else if (ratio >= 0.3) setScaleValue(0.85);
        else if (ratio >= 0.1) setScaleValue(0.8);
        else setScaleValue(0.75);
      },
      {
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1],
      }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    return () => {
      if (featuresRef.current) {
        observer.unobserve(featuresRef.current);
      }
    };
  }, []);


  const onSubmit = async (e) => {
    const isValid = await trigger();
    if (!isValid) {
      e.preventDefault();
    }
  };

  return (
    <div className='landing-container'>

      {/* Navbar Section */}
      <div className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {/* LOGO Animation */}

          <a href="#top-section" className="navbar-logo">
            <img className="loading-logo" src="/bizalign_loading_loop.gif" alt="BizAlign Logo Animation" />
            <img className="navbar-text" src="/bizalign_nav_text.png" alt="BizAlign Text" />
          </a>


          {/* Navigation Links */}
          <div className={`landing-options ${menuOpen ? "open" : ""}`}>
            <a href="#features-section">Why us?</a>
            <a href="#download">Download</a>
            <a href="#contact-section">Contact</a>
            <button onClick={() => navigate('/login')}>Login</button>
          </div>

          {/* Hamburger Menu for Mobile */}
          <div className="hamburger-menu" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </div>
        </div>
      </div>


      <>

        <section id='top-section' className='hero-section'>
          <div className='hero-bg'></div>

          <div className="hero-content">
            {/* Subtitle and Title */}
            <motion.h3
              className="hero-subtitle"
              initial={{ opacity: 0 }}
              animate={showHeroContent ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              BizAlign
            </motion.h3>

            <motion.h1
              className="hero-title"
              initial={{ opacity: 0 }}
              animate={showHeroContent ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <span className="gradient-text">Effortless business management.</span>
            </motion.h1>

            {/* Image Wrapper: gif first, then SVG */}
            <div className="hero-image-wrapper">
              {showHeroGif ? (
                <motion.img
                  src="/Biz_Align_splash.gif"
                  alt="BizAlign Splash"
                  className="hero-splash-gif"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              ) : (
                <motion.img
                  src="/loop.svg"
                  alt="BizAlign System"
                  className="hero-image fade-in"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 2 }}
                />
              )}
            </div>

            {/* Tagline and Description */}
            <motion.p
              className="hero-tagline"
              initial={{ opacity: 0 }}
              animate={showHeroContent ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              Total business management <span className="gradient-subtext">ERP System.</span>
            </motion.p>

            <motion.div
              className="hero-description"
              initial={{ opacity: 0 }}
              animate={showHeroContent ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.95 }}
            >
              <span className="gradient-subtext">BizAlign</span> is the ultimate solution for businesses looking to automate workflows,
              enhance productivity, and ensure seamless operations. Say goodbye to manual processes
              and embrace a smarter way of managing your business!
            </motion.div>
          </div>
        </section>




        {/* Features Section */}
        <section
          id="features-section"
          className={`features-section`}
          ref={featuresRef}
        >
          <motion.h2
            ref={titleRef}
            className="features-title"
            initial={{ y: 20, opacity: 0 }}
            animate={isTitleInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            Why Choose <span className="gradient-subtext">BizAlign?</span>
          </motion.h2>
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1.5}
            centeredSlides={true}
            autoplay={{ delay: 5000 }}
            loop={true}
          >
            {features.map((feature, index) => (
              <SwiperSlide key={index}>
                <div
                  className="feature-slide"
                  style={{
                    backgroundImage: `url(${feature.image})`,
                    transform: `scale(${scaleValue})`,
                    transition: 'transform 0.4s ease-in-out'
                  }}
                >
                  <div className="feature-text-overlay">
                    <h3>
                      {feature.title}:<br />
                      {feature.description}
                    </h3>

                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Download Section */}
        <section id='download' className="download-section">
          <motion.p
            ref={downloadRef}
            className="download-title-head"
            initial={{ y: -20, opacity: 0 }}
            animate={isdownloadInView ? { y: 0, opacity: 1 } : { y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            find us &

          </motion.p>
          <motion.h2
            ref={downloadRef}
            className="download-title"
            initial={{ y: 20, opacity: 0 }}
            animate={isdownloadInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <span className="gradient-subtext">Download</span> from
          </motion.h2>
          <div className="download-container">
            {/* Google Play Store Card */}
            <a href="https://play.google.com/store/apps/details?id=com.arexperts.bizalign" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div className="download-card" ref={googleRef}>
                <span className="gradient-motiongoogle">
                  <motion.h3
                    className="store-text"
                    initial={{ opacity: 0 }}
                    animate={isGoogleInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 1 }}
                  >
                    Google Play Store
                  </motion.h3>
                </span>

                <motion.img
                  src="/playstore.png"
                  alt="Google Play Store"
                  className="phone-mockup"
                  initial={{ y: 100, opacity: 0 }}
                  animate={isGoogleInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>

            </a>

            {/* App Store Card */}
            <a href="https://apps.apple.com/gb/app/bizalign-erp-system/id6742386791?uo=2" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div className="download-card" ref={appleRef}>
                <span className="gradient-motionapple">
                  <motion.h3
                    className="store-text"
                    initial={{ opacity: 0 }}
                    animate={isAppleInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 1 }}
                  >
                    App Store
                  </motion.h3>
                </span>

                <motion.img
                  src="/appstore.png"
                  alt="App Store"
                  className="phone-mockup"
                  initial={{ y: 100, opacity: 0 }}
                  animate={isAppleInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                />
              </div>

            </a>
          </div>

          {/* QR Code Section */}
          <div className="qr-section">
            <p className="qr-title"><span className="gradient-subtext">Scan to download the app!</span></p>
            <div className="qr-codes">
              <div className="qr-card">
                <img src="/playqr.svg" alt="Google Play QR Code" />
                <p>Google Play Store</p>
              </div>
              <div className="qr-card">
                <img src="/appleqr.svg" alt="App Store QR Code" />
                <p>App Store</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="hero-description">
            Simplify your operations and boost efficiency with our all-in-one ERP
            System.
            <br />
            <span className="gradient-motiongoogle">Ready to see the difference?</span>{" "}
            Request your personalised demo today!
            <br />
            Experience seamless ERP System—{" "}
            <span className="gradient-motionapple">Book your demo now!</span>
            <br />
          </div>
        </section>




        {/* Contact Section */}
        <section id="contact-section" className="contact-section">
          <div className="contact-container">
            <h2 className="contact-heading">Contact Us</h2>
            <p className="contact-subheading">
              We’d love to hear from you! Whether you have questions, need assistance, or want to learn more about our services, feel free to reach out.<br />

            </p>

            {/* Contact Form */}
            <form
              className="contact-form"
              target="_blank"
              onSubmit={onSubmit}
              action="https://formsubmit.co/admin@bizalign.co.uk"
              method="POST"
            >
              {/* Name Field */}
              <div className="input-container">
                <i className="input-icon fas fa-user"></i>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Your Name"
                  {...register("name", { required: true, maxLength: 100 })}
                />
              </div>
              {errors.name && <p className="form-error">This field is required.</p>}

              {/* Email Field */}
              <div className="input-container">
                <i className="input-icon fas fa-envelope"></i>
                <input
                  className="form-input"
                  type="email"
                  placeholder="Your Email"
                  {...register("email", {
                    required: true,
                    pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  })}
                />
              </div>
              {errors.email && <p className="form-error">Invalid email address.</p>}

              {/* Message Field */}
              <div className="input-container">
                <textarea
                  className="form-textarea"
                  placeholder="Your Message"
                  rows="4"
                  {...register("message", { required: true, maxLength: 2000 })}
                />
              </div>
              {errors.message && <p className="form-error">This field is required.</p>}

              {/* Submit Button */}
              <button type="submit" className="form-submit-button">
                SEND MESSAGE
              </button>
            </form>
            <p className="contact-subheading">
              We aim to respond within 3 business days.<br /> However, during peak periods, responses may take slightly longer.

              We appreciate your patience and will do our best to get back to you as soon as possible.<br />

            </p>
          </div>
        </section>

        {/* Footer Section */}
        {/* Footer Section */}
        <footer className="footer">
          <div className="footer-container">
            <p>
              <NavLink to="/privacypolicy" className="footer-link">Privacy Policy</NavLink> |
              © 2025 <strong>BizAlign</strong>. All Rights Reserved.
            </p>
          </div>
        </footer>
      </>
    </div >
  );
}

export default LandingPage;