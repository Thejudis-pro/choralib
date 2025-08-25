import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Users, Shield, Star } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="ChoraLib - Professional Choir Management" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Music className="w-12 h-12" />
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                ChoraLib
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white/90 font-medium">
              Cross-platform Mobile & Web
            </p>
            <p className="text-lg md:text-xl text-white/80 mt-2">
              Professional choir partition management made simple
            </p>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <Users className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold text-lg mb-2">For Choir Masters</h3>
              <p className="text-white/80 text-sm">
                Create choirs, upload partitions, manage your library with advanced tools
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <Shield className="w-8 h-8 mx-auto mb-3 text-success" />
              <h3 className="font-semibold text-lg mb-2">For Singers</h3>
              <p className="text-white/80 text-sm">
                Access your choir's library, search partitions, view PDFs anywhere
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <Star className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold text-lg mb-2">Big Library Access</h3>
              <p className="text-white/80 text-sm">
                Admins get exclusive access to our comprehensive partition library
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth">
              <Button variant="hero" size="lg" className="min-w-48">
                Start as Admin
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="member" size="lg" className="min-w-48">
                Join a Choir
              </Button>
            </Link>
          </div>
          
          <p className="text-white/70 text-sm mt-6">
            Free for singers • Yearly subscription for choir masters
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;