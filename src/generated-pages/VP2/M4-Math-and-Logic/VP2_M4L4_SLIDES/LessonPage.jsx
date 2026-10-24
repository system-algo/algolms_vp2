import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M4L4_SLIDES() {
  const activity = {
    id: "VP2_M4L4_SLIDES",
    title: "Slide: M4L4 - Coordinate areas",
    embedUrl: "https://docs.google.com/presentation/d/1X38mJEgutHBQlDAaaWha-v_D7Q7D5Ogz0kfXGeCq928/embed?start=false&loop=false&delayms=3000",
    moduleId: "M4-Math-and-Logic",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP2"
      onBack={() => window.history.back()}
    />
  );
}
