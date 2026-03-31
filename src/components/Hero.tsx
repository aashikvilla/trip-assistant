import { Button } from "@/components/ui/Button";
import { ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { JoinTripDialog } from "./JoinTripDialog";
import heroImage from "@/assets/hero-travel.jpg";
import { useState } from "react";

const Hero = () => {
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Beautiful tropical destination with crystal clear water and traveler"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-75"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Plan Your Perfect
            <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Adventure
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Discover, plan, and share amazing trips with Vibe Trip. From solo
            adventures to group getaways, we make travel planning effortless.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="lg" className="group" asChild>
              <Link href="/auth">
                Start Planning
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              variant="outline-hero"
              size="lg"
              onClick={() => setShowJoinDialog(true)}
            >
              <Users className="mr-2 h-5 w-5" />
              Join Trip
            </Button>
            <Button variant="outline-hero" size="lg" asChild>
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>

          {/* Features Pills */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <MapPin className="h-4 w-4" />
              AI-Powered Suggestions
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Calendar className="h-4 w-4" />
              Smart Itineraries
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="h-4 w-4" />
              Group Coordination
            </div>
          </div>
        </div>

        {/* Join Trip Dialog */}
        <JoinTripDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
        />

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
