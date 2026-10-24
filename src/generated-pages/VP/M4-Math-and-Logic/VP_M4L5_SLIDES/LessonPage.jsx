import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M4L5_SLIDES() {
  const activity = {
    id: "VP_M4L5_SLIDES",
    title: "Slide: M4L5 - Group project. Planning",
    embedUrl: "https://docs.google.com/presentation/d/1ocbu9nuErKf1RZyHD_9xVkh5O7Hh4K8Mtkp8R_T4_yU/embed?start=false&loop=false&delayms=3000",
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
