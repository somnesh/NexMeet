import { useState, useEffect } from "react";
import {
  Video,
  Mic,
  Camera,
  Users,
  Shield,
  Smartphone,
  Monitor,
  Tablet,
  Zap,
  Lock,
  Globe,
  DollarSign,
  Mail,
  FileText,
  Eye,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import useTheme from "../contexts/Theme";
import { Link, useLocation } from "react-router-dom";

export default function NexMeetInfoPage() {
  const [activeSection, setActiveSection] = useState("features");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  //   const [theme, setTheme] = useState("light");
  const [isVisible, setIsVisible] = useState({});
  const { theme } = useTheme();

  const { state } = useLocation();

  useEffect(() => {
    if (state && state.path) {
      setActiveSection(state.path);
      // Increase the delay and ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(state.path);
        if (element) {
          scrollToSection(state.path);
        } else {
          // If element not found, try again after a longer delay
          setTimeout(() => scrollToSection(state.path), 500);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [state]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const sections = [
    { id: "features", label: "Features" },
    { id: "pricing", label: "Pricing" },
    { id: "support", label: "Support" },
    { id: "privacy", label: "Privacy" },
    { id: "terms", label: "Terms" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500">
        {/* Navigation Header */}
        <nav className="sticky top-0 z-50 bg-white/95 dark:bg-black backdrop-blur-sm border-b border-gray-200 dark:border-none transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link
                to={"/"}
                className="flex items-center space-x-2 animate-fade-in"
              >
                {theme === "dark" ? (
                  <img
                    src="/icon-512x512.png"
                    alt="NexMeet Logo"
                    className="h-8 w-8 object-cover rounded-full"
                  />
                ) : (
                  <img
                    src="/logo-light-mode-512x512.png"
                    alt="NexMeet Logo"
                    className="h-8 w-8 object-cover rounded-full"
                  />
                )}
                <span className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">
                  NexMeet
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`px-3 py-2 text-sm font-medium transition-all duration-300 transform hover:cursor-pointer ${
                      activeSection === section.id
                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center space-x-2">
                <button
                  className="p-2 transition-transform duration-300"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6 dark:text-white" />
                  ) : (
                    <Menu className="h-6 w-6 dark:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Features Section */}
        <section
          id="features"
          className={`py-20 transition-all duration-1000 ${
            isVisible.features
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
                Everything you need for seamless video conferencing, built with
                cutting-edge technology
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Real-time Video Calls */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "100ms" }}
              >
                <div className="flex items-center mb-4">
                  <Video className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3 transition-colors duration-300" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Real-time Video Calls
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  High-quality video calls with multiple participants
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    Multiple participants support
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    HD video quality
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    Adaptive streaming
                  </li>
                </ul>
              </div>

              {/* Audio Controls */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "200ms" }}
              >
                <div className="flex items-center mb-4">
                  <Mic className="h-8 w-8 text-green-600 dark:text-green-400 mr-3 transition-colors duration-300" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Audio Controls
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  Full control over your audio experience
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                    Mute/unmute toggle
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                    Noise cancellation
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                    Audio quality optimization
                  </li>
                </ul>
              </div>

              {/* Camera Controls */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "300ms" }}
              >
                <div className="flex items-center mb-4">
                  <Camera className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-3 transition-colors duration-300" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Camera Controls
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  Flexible camera management options
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    Camera on/off toggle
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    Video quality settings
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    Background blur
                  </li>
                </ul>
              </div>

              {/* Meeting Management */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "400ms" }}
              >
                <div className="flex items-center mb-4">
                  <Users className="h-8 w-8 text-orange-600 dark:text-orange-400 mr-3 transition-colors duration-300" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Meeting Management
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  Easy meeting creation and management
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
                    Create meetings instantly
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
                    Join with meeting ID
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
                    Real-time participant list
                  </li>
                </ul>
              </div>

              {/* Responsive Design */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "500ms" }}
              >
                <div className="flex items-center mb-4">
                  <div className="flex space-x-1 mr-3">
                    <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <Tablet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Responsive Design
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  Works perfectly on all devices
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    Mobile optimized
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    Tablet friendly
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    Desktop experience
                  </li>
                </ul>
              </div>

              {/* Security & Privacy */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-500 transform  "
                style={{ animationDelay: "600ms" }}
              >
                <div className="flex items-center mb-4">
                  <Shield className="h-8 w-8 text-red-600 dark:text-red-400 mr-3 transition-colors duration-300" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    Security & Privacy
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors duration-300">
                  Enterprise-grade security for all meetings
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                    End-to-end encryption
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                    Private rooms
                  </li>
                  <li className="flex items-center transform transition-transform duration-300 ">
                    <ChevronRight className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                    Secure meeting IDs
                  </li>
                </ul>
              </div>
            </div>

            {/* Technical Features */}
            <div
              className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl p-8 text-white transform transition-all duration-700  animate-fade-in-up"
              style={{ animationDelay: "800ms" }}
            >
              <h3 className="text-2xl font-bold mb-6 text-center animate-bounce-in">
                Technical Excellence
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                  className="text-center animate-fade-in-up"
                  style={{ animationDelay: "900ms" }}
                >
                  <Zap className="h-12 w-12 mx-auto mb-3 text-yellow-300" />
                  <h4 className="font-semibold mb-2">WebRTC Technology</h4>
                  <p className="text-sm opacity-90">
                    Peer-to-peer video communication
                  </p>
                </div>
                <div
                  className="text-center animate-fade-in-up"
                  style={{ animationDelay: "1000ms" }}
                >
                  <Globe className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <h4 className="font-semibold mb-2">Cross-Platform</h4>
                  <p className="text-sm opacity-90">
                    Works on all modern browsers
                  </p>
                </div>
                <div
                  className="text-center animate-fade-in-up"
                  style={{ animationDelay: "1100ms" }}
                >
                  <Zap className="h-12 w-12 mx-auto mb-3 text-blue-300" />
                  <h4 className="font-semibold mb-2">Low Latency</h4>
                  <p className="text-sm opacity-90">Real-time communication</p>
                </div>
                <div
                  className="text-center animate-fade-in-up"
                  style={{ animationDelay: "1200ms" }}
                >
                  <Lock className="h-12 w-12 mx-auto mb-3 text-red-300" />
                  <h4 className="font-semibold mb-2">Encrypted</h4>
                  <p className="text-sm opacity-90">
                    Secure connections always
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className={`py-20 bg-white dark:bg-black transition-colors duration-500 ${
            isVisible.pricing
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
                No hidden fees, no subscriptions, no limits. Just free video
                conferencing for everyone.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-2xl p-8 border-2 border-green-200 dark:border-green-700 relative overflow-hidden transition-all duration-500 transform ">
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  100% FREE
                </div>

                <div className="text-center mb-8">
                  <DollarSign className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4 transition-colors duration-300" />
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                    Forever Free
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    Everything you need, completely free
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-300">
                        No subscriptions
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-300">
                        No usage limits
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-300">
                        No hidden fees
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">✓</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-300">
                        No advertisements
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <Link to={"/"}>
                    <button className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors cursor-pointer">
                      Start Using NexMeet Now
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors duration-300">
                We believe video conferencing should be accessible to everyone.
                That's why NexMeet is completely free, with no strings attached.
                No premium tiers, no feature limitations, just great video
                calling for all.
              </p>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section
          id="support"
          className={`py-20 bg-gray-50 dark:bg-black transition-colors duration-500 ${
            isVisible.support
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                Get Support
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-300">
                Need help? We're here to assist you with any questions or issues
                you might have.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg transition-colors duration-500">
                <div className="text-center mb-8">
                  <Mail className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4 transition-colors duration-300" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                    Email Support
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    Send us an email and we'll get back to you as soon as
                    possible
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 text-center transition-colors duration-500">
                  <p className="text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                    Contact us at:
                  </p>
                  <a
                    href="mailto:example@gmail.com"
                    className="text-2xl font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
                  >
                    example@gmail.com
                  </a>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-500">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                      Response Time
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                      Usually within 24 hours
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-500">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
                      Support Hours
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                      Monday - Friday, 9 AM - 6 PM
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg transition-colors duration-500">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 transition-colors duration-300">
                    Before contacting support:
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 transition-colors duration-300">
                    <li>
                      • Make sure you're using a supported browser (Chrome,
                      Firefox, Safari, Edge)
                    </li>
                    <li>• Check your internet connection</li>
                    <li>• Try refreshing the page</li>
                    <li>
                      • Include your browser version and operating system in
                      your email
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Policy Section */}
        <section
          id="privacy"
          className={`py-20 bg-white dark:bg-black transition-colors duration-500 ${
            isVisible.privacy
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <Eye className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4 transition-colors duration-300" />
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                Privacy Policy
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors duration-300">
                Your privacy is important to us. Here's how we protect your
                information.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-8 transition-colors duration-500">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Information We Collect
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p className="mb-4">
                    NexMeet is designed with privacy in mind. We collect minimal
                    information necessary to provide our video conferencing
                    service:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Meeting participation data (only during active meetings)
                    </li>
                    <li>
                      Technical information for service optimization (browser
                      type, connection quality)
                    </li>
                    <li>No personal identification information is stored</li>
                    <li>No meeting content is recorded or stored</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  How We Use Your Information
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To facilitate video conferencing sessions</li>
                    <li>To improve service quality and performance</li>
                    <li>To provide technical support when requested</li>
                    <li>To ensure security and prevent abuse</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Data Security
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p className="mb-4">
                    We implement industry-standard security measures to protect
                    your information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      End-to-end encryption for all video and audio
                      communications
                    </li>
                    <li>
                      Secure WebRTC protocols for peer-to-peer connections
                    </li>
                    <li>No permanent storage of meeting content</li>
                    <li>Regular security audits and updates</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Third-Party Services
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    NexMeet does not share your information with third parties
                    for marketing purposes. We may use essential third-party
                    services for infrastructure and security, all of which are
                    bound by strict privacy agreements.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Your Rights
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>You can leave any meeting at any time</li>
                    <li>You control your camera and microphone settings</li>
                    <li>
                      You can request information about data we may have
                      collected
                    </li>
                    <li>You can request deletion of any stored data</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Contact Us
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    If you have any questions about this Privacy Policy, please
                    contact us at{" "}
                    <a
                      href="mailto:example@gmail.com"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
                    >
                      example@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <p>Last updated: 3rd June 2025</p>
              </div>
            </div>
          </div>
        </section>

        {/* Terms & Conditions Section */}
        <section
          id="terms"
          className={`py-20 bg-gray-50 dark:bg-black transition-colors duration-500 ${
            isVisible.terms
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-in-up">
              <FileText className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4 transition-colors duration-300" />
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                Terms & Conditions
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 transition-colors duration-300">
                Please read these terms carefully before using NexMeet.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-8 transition-colors duration-500">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Acceptance of Terms
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    By accessing and using NexMeet, you accept and agree to be
                    bound by the terms and provision of this agreement. If you
                    do not agree to abide by the above, please do not use this
                    service.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Use License
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p className="mb-4">
                    Permission is granted to temporarily use NexMeet for
                    personal and commercial video conferencing purposes. This
                    includes:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Creating and joining video meetings</li>
                    <li>Using all available features during meetings</li>
                    <li>Sharing meeting links with other participants</li>
                  </ul>
                  <p className="mt-4">
                    This license shall automatically terminate if you violate
                    any of these restrictions and may be terminated by us at any
                    time.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Prohibited Uses
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p className="mb-4">You may not use NexMeet for:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Any unlawful purpose or to solicit others to perform
                      unlawful acts
                    </li>
                    <li>
                      Violating any international, federal, provincial, or state
                      regulations, rules, laws, or local ordinances
                    </li>
                    <li>
                      Infringing upon or violating our intellectual property
                      rights or the intellectual property rights of others
                    </li>
                    <li>
                      Harassing, abusing, insulting, harming, defaming,
                      slandering, disparaging, intimidating, or discriminating
                    </li>
                    <li>Submitting false or misleading information</li>
                    <li>
                      Uploading or transmitting viruses or any other type of
                      malicious code
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Service Availability
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    While we strive to provide continuous service, NexMeet is
                    provided "as is" without any guarantees of availability,
                    reliability, or suitability for any particular purpose. We
                    reserve the right to modify or discontinue the service at
                    any time without notice.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  User Responsibilities
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      You are responsible for your conduct during video meetings
                    </li>
                    <li>
                      You must respect other participants and maintain
                      appropriate behavior
                    </li>
                    <li>
                      You are responsible for the security of your meeting IDs
                    </li>
                    <li>
                      You must not record meetings without consent from all
                      participants
                    </li>
                    <li>
                      You must comply with all applicable laws and regulations
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Limitation of Liability
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    In no event shall NexMeet or its suppliers be liable for any
                    damages (including, without limitation, damages for loss of
                    data or profit, or due to business interruption) arising out
                    of the use or inability to use NexMeet, even if NexMeet or a
                    NexMeet authorized representative has been notified orally
                    or in writing of the possibility of such damage.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Modifications
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    NexMeet may revise these terms of service at any time
                    without notice. By using this service, you are agreeing to
                    be bound by the then current version of these terms of
                    service.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  Contact Information
                </h3>
                <div className="prose text-gray-600 dark:text-gray-300 transition-colors duration-300">
                  <p>
                    If you have any questions about these Terms & Conditions,
                    please contact us at{" "}
                    <a
                      href="mailto:example@gmail.com"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
                    >
                      example@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <p>Last updated: 3rd June 2025</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 dark:bg-black text-white py-12 border border-t-gray-700 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <Link
                to={"/"}
                className="flex items-center space-x-2 mb-4 md:mb-0"
              >
                {theme === "dark" ? (
                  <img
                    src="/icon-512x512.png"
                    alt="NexMeet Logo"
                    className="h-8 w-8 object-cover rounded-full"
                  />
                ) : (
                  <img
                    src="/logo-light-mode-512x512.png"
                    alt="NexMeet Logo"
                    className="h-8 w-8 object-cover rounded-full"
                  />
                )}
                <span className="text-2xl font-bold">NexMeet</span>
              </Link>
              <div className="flex space-x-6">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
      <style jsx>{`\
  @keyframes
  fadeInUp
  from
  opacity: 0
  transform: translateY(30px)
  to
  opacity: 1
  transform: translateY(0)
  @keyframes
  fadeIn
  from
  opacity: 0
  to
  opacity: 1

  @keyframes
  slideDown
  from
  opacity: 0
  transform: translateY(-10px)
  to
  opacity: 1
  transform: translateY(0)

  @keyframes
  bounceIn
  0% {
          opacity: 0;
  transform: scale(0.3)
  50% {
          transform: scale(1.05);
}
70% {
          transform: scale(0.9);
}
        100%
{
  opacity: 1
  transform: scale(1)
}
}
      
      .animate-fade-in-up
{
  animation: fadeInUp
  0.8s ease-out forwards
}

.animate-fade-in
{
  animation: fadeIn
  0.6s ease-out forwards
}

.animate-slide-down
{
  animation: slideDown
  0.3s ease-out forwards
}

.animate-bounce-in
{
  animation: bounceIn
  0.8s ease-out forwards
}
`}</style>
    </>
  );
}
