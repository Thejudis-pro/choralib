import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  Users, 
  Upload, 
  Search, 
  Library, 
  Smartphone, 
  Mail, 
  Eye,
  Heart,
  FileText,
  Shield
} from "lucide-react";

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gradient">
            Two Experiences, One Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ChoraLib provides tailored experiences for choir masters and singers, 
            each optimized for their specific needs.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Admin Features */}
          <Card className="shadow-large bg-gradient-card border-accent/20">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-admin rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl mb-2">Admin Flow</CardTitle>
              <p className="text-muted-foreground">For Choir Masters & Directors</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Create Choir</h4>
                  <p className="text-sm text-muted-foreground">Set up your choir with name and unique access code</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Upload PDF + Metadata</h4>
                  <p className="text-sm text-muted-foreground">Add partitions with title, composer, voice type, and tags</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Invite Members</h4>
                  <p className="text-sm text-muted-foreground">Send email invites or share choir access codes</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Library className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Manage Choir Library</h4>
                  <p className="text-sm text-muted-foreground">Organize, update, and delete partitions</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-accent/10 p-3 rounded-lg border border-accent/20">
                <FileText className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-accent">Big Library Access</h4>
                  <p className="text-sm text-muted-foreground">Exclusive access to search and import from our comprehensive partition collection</p>
                </div>
              </div>
              
              <Button variant="admin" className="w-full mt-6">
                Start as Admin - $99/year
              </Button>
            </CardContent>
          </Card>

          {/* Member Features */}
          <Card className="shadow-large bg-gradient-card border-primary/20">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-member rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-2">Member Flow</CardTitle>
              <p className="text-muted-foreground">For Choir Singers</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Join Choir</h4>
                  <p className="text-sm text-muted-foreground">Use invite code or email invitation to join</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Library className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Access Choir Library</h4>
                  <p className="text-sm text-muted-foreground">View all partitions shared by your choir master</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Search Library</h4>
                  <p className="text-sm text-muted-foreground">Find partitions by title, composer, voice type, or tags</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">View PDFs</h4>
                  <p className="text-sm text-muted-foreground">In-app PDF viewer optimized for mobile and web</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Favorite Partitions</h4>
                  <p className="text-sm text-muted-foreground">Save your favorite pieces for quick access</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Mobile & Web Access</h4>
                  <p className="text-sm text-muted-foreground">Access your music anywhere, anytime</p>
                </div>
              </div>
              
              <Button variant="member" className="w-full mt-6">
                Join a Choir - Free
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Features */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-8">Built for Performance & Security</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6">
              <Shield className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h4 className="font-semibold mb-2">Secure Storage</h4>
              <p className="text-sm text-muted-foreground">Cloud storage with signed URLs and duplicate detection</p>
            </div>
            <div className="p-6">
              <Search className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h4 className="font-semibold mb-2">Fast Search</h4>
              <p className="text-sm text-muted-foreground">Full-text search across all metadata fields</p>
            </div>
            <div className="p-6">
              <Smartphone className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h4 className="font-semibold mb-2">Cross-Platform</h4>
              <p className="text-sm text-muted-foreground">Native mobile apps and responsive web interface</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;