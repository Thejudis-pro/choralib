import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, Fair Pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Free for singers, affordable for choir masters. 
            Start building your musical community today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Member Plan */}
          <Card className="shadow-medium relative">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-member rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl mb-2">Singer</CardTitle>
              <div className="text-4xl font-bold text-primary">Free</div>
              <p className="text-muted-foreground">Perfect for choir members</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Join unlimited choirs</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Access choir partition libraries</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Search and filter partitions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>In-app PDF viewer</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Favorite partitions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Mobile & web access</span>
                </li>
              </ul>
              <Link to="/auth">
                <Button variant="member" className="w-full">
                  Join as Singer
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Plan */}
          <Card className="shadow-large relative border-accent border-2">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-admin text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-admin rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl mb-2">Choir Master</CardTitle>
              <div className="text-4xl font-bold text-accent">$99</div>
              <p className="text-muted-foreground">per year</p>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-accent">Everything in Singer, plus:</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Create and manage choirs</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Upload unlimited partitions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Invite unlimited members</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Advanced library management</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Duplicate detection</span>
                </li>
                <li className="flex items-center gap-3 bg-accent/10 p-2 rounded border border-accent/20">
                  <Check className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="font-semibold text-accent">Exclusive Big Library access</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link to="/auth">
                <Button variant="admin" className="w-full">
                  Start Managing Choirs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Need help choosing? <a href="mailto:support@choralib.com"><Button variant="link" className="p-0 h-auto">Contact our team</Button></a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;