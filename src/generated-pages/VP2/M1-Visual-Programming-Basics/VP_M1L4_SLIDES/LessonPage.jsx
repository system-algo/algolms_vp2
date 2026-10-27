import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M1L4_SLIDES() {
  const activity = {
    id: "VP_M1L4_SLIDES",
    title: "Slide: M1L4 - Events",
    embedUrl: "https://docs.google.com/presentation/d/1m_6-be8zrQPtSurI7lP4objOUeqQNz1wep5UqmzRx_w/embed?start=false&loop=false&delayms=3000",
    moduleId: "M1-Visual-Programming-Basics",
  };

  return (
    <GoogleSlidesPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
