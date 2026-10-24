import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M4L2_SLIDES() {
  const activity = {
    id: "VP_M4L2_SLIDES",
    title: "Slide: M4L2 - Conditional loop",
    embedUrl: "https://docs.google.com/presentation/d/1tSfPKiUsY8MSBm8EOq-Uo1wiQZnreDY3eo4jePQGBzM/embed?start=false&loop=false&delayms=3000",
    moduleId: "M4-Math-and-Logic",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
