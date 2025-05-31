import { Card, CardContent } from "@/components/ui/card";

export default function MeetingsLoader() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 dark:bg-[#121212] bg-[#fbfbfb] min-h-screen">
      {/* Meeting Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card
            key={index}
            className="bg-card text-card-foreground overflow-hidden p-6"
          >
            <CardContent className="p-0 space-y-6">
              {/* Meeting Title */}
              <div className="space-y-3">
                <div
                  className="h-6 dark:bg-gray-700 bg-gray-200 rounded animate-pulse"
                  style={{
                    width: `${Math.random() * 40 + 60}%`,
                    animationDelay: `${index * 0.1}s`,
                  }}
                ></div>

                {/* Status Line with Clock Icon */}
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 dark:bg-gray-700 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex items-center space-x-2">
                    <div
                      className="h-4 dark:bg-gray-700 bg-gray-200 rounded animate-pulse w-20"
                      style={{ animationDelay: `${index * 0.1 + 0.1}s` }}
                    ></div>
                    <div className="w-1 h-1 dark:bg-gray-700 bg-gray-200 rounded-full"></div>
                    <div
                      className="h-4 dark:bg-gray-700 bg-gray-200 rounded animate-pulse w-24"
                      style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Meeting ID with Code Icon */}
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 dark:bg-gray-700 bg-gray-200 rounded animate-pulse"></div>
                <div
                  className="h-4 dark:bg-gray-700 bg-gray-200 rounded animate-pulse w-28"
                  style={{ animationDelay: `${index * 0.1 + 0.3}s` }}
                ></div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <div
                  className="h-10 dark:bg-gray-600 bg-gray-200 rounded-md animate-pulse flex-1"
                  style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
                ></div>
                <div
                  className="h-10 dark:bg-gray-600 bg-gray-200 rounded-md animate-pulse flex-1"
                  style={{ animationDelay: `${index * 0.1 + 0.5}s` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button Skeleton */}
      <div className="flex justify-center mt-8">
        <div className="h-10 dark:bg-gray-700 bg-gray-200 rounded-md animate-pulse w-32"></div>
      </div>
    </div>
  );
}
