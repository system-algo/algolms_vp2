import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M6L2_SLIDES() {
  const activity = {
    id: "VP_M6L2_SLIDES",
    title: "Slide: M6L2 - Local and global variables",
    embedUrl: "https://docs.google.com/presentation/d/1ofWfGh6Jn38S5ZDsnxzdUWNwO9sj33X7ypHUViVZ9Ao/embed?start=false&loop=false&delayms=3000",
    moduleId: "M6-Advanced-Projects",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
