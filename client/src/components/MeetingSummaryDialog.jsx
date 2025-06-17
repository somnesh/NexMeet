"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Target,
  MessageSquare,
  ArrowRight,
  User,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

export default function MeetingSummaryDialog({ meetingData, open, setOpen }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="shadow-lg">
            <MessageSquare className="w-4 h-4 mr-2" />
            View Meeting Summary
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{meetingData.title}</span>
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="truncate">{meetingData.duration}</span>
              </div>
              {meetingData.participants.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {meetingData.participants.length} participants
                </div>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Summary */}
              <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    Meeting Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
                    {meetingData.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Key Points */}
              {meetingData.keyPoints.length > 0 && (
                <Card className="border-l-4 border-l-green-500 dark:border-l-green-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {meetingData.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {meetingData.actionItems.length > 0 && (
                <Card className="border-l-4 border-l-orange-500 dark:border-l-orange-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {meetingData.actionItems.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <p className="text-gray-800 dark:text-gray-200 font-medium flex-1 text-sm sm:text-base">
                              {item.task}
                            </p>
                            <div className="flex flex-col sm:items-end gap-2">
                              {item.assignee && (
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1 w-fit bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                                >
                                  <User className="w-3 h-3" />
                                  {item.assignee}
                                </Badge>
                              )}
                              {item.deadline && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1 w-fit border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300"
                                >
                                  <CalendarDays className="w-3 h-3" />
                                  {item.deadline}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decisions */}
              {meetingData.decisions.length > 0 && (
                <Card className="border-l-4 border-l-purple-500 dark:border-l-purple-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                      Decisions Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {meetingData.decisions.map((decision, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                            {decision}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Participants */}
                {meetingData.participants.length > 0 && (
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                        Participants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {meetingData.participants.map((participant, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                          >
                            {participant}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Topics */}
                {meetingData.topics.length && (
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                        Topics Discussed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {meetingData.topics.map((topic, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Next Steps */}
              {meetingData.nextSteps.length > 0 && (
                <Card className="border-l-4 border-l-teal-500 dark:border-l-teal-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {meetingData.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-medium mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
