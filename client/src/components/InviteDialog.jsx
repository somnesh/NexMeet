import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus, Copy, Link, Hash } from "lucide-react";
import { toast } from "sonner";

export default function InviteDialog({ meetingUrl, meetingCode, onlyIcon }) {
  const [open, setOpen] = useState(false);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (err) {
      toast.error(`Failed to copy ${type}: ${err.message}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 cursor-pointer">
          <UserPlus className={`h-4 w-4 ${onlyIcon && "mr-1"}`} />
          {onlyIcon && "Invite"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Invite others to join</h4>
          </div>

          <div className="space-y-3">
            {/* Meeting URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link className="h-4 w-4" />
                Meeting URL
              </div>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-3 text-left cursor-pointer"
                onClick={() => copyToClipboard(meetingUrl, "Meeting URL")}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm truncate pr-2">{meetingUrl}</span>
                  <Copy className="h-4 w-4 flex-shrink-0" />
                </div>
              </Button>
            </div>

            {/* Meeting Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Meeting Code
              </div>
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-3 text-left cursor-pointer"
                onClick={() => copyToClipboard(meetingCode, "Meeting code")}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-mono tracking-wider">
                    {meetingCode}
                  </span>
                  <Copy className="h-4 w-4 flex-shrink-0" />
                </div>
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Click on any option above to copy to clipboard
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
