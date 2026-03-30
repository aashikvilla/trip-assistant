import { Card, CardContent } from "@/components/ui/Card";
import { 
  Brain, 
  Calendar, 
  Users, 
  MapPin, 
  CreditCard, 
  Wifi,
  PieChart,
  Camera
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Planning",
    description: "Get personalized trip suggestions based on your preferences, budget, and travel style.",
    gradient: "bg-gradient-ocean"
  },
  {
    icon: Calendar,
    title: "Smart Itineraries", 
    description: "Drag-and-drop itinerary builder with real-time optimization and scheduling.",
    gradient: "bg-gradient-sunset"
  },
  {
    icon: Users,
    title: "Group Coordination",
    description: "Collaborate with friends, vote on activities, and coordinate group travel seamlessly.",
    gradient: "bg-gradient-adventure"
  },
  {
    icon: CreditCard,
    title: "Integrated Booking",
    description: "Book flights, hotels, and activities directly within the app with best price guarantees.",
    gradient: "bg-gradient-hero"
  },
  {
    icon: MapPin,
    title: "Real-time Discovery",
    description: "Find hidden gems and local experiences based on your current location.",
    gradient: "bg-gradient-ocean"
  },
  {
    icon: Wifi,
    title: "Offline Access",
    description: "Access your itinerary, maps, and essential travel info without internet connection.",
    gradient: "bg-gradient-sunset"
  },
  {
    icon: PieChart,
    title: "Expense Tracking",
    description: "Track group expenses, split bills, and manage your travel budget effortlessly.",
    gradient: "bg-gradient-adventure"
  },
  {
    icon: Camera,
    title: "Memory Compilation",
    description: "Automatically create beautiful travel albums and share memories with your group.",
    gradient: "bg-gradient-hero"
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything You Need for
            <span className="block text-primary">Perfect Trips</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From initial planning to post-trip memories, Vibe Trip provides all the tools 
            you need for unforgettable travel experiences.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-medium transition-all duration-500 hover:-translate-y-2 border-0 shadow-soft overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg ${feature.gradient} mb-4 flex items-center justify-center shadow-soft`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;