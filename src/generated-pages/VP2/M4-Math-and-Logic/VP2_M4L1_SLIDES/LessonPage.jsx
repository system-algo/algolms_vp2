import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M4L1_SLIDES() {
  const activity = {
    id: "VP2_M4L1_SLIDES",
    title: "Slide: M4L1 - Logical operators",
    embedUrl: "https://docs.google.com/presentation/d/1NjPXjt6Otp2qOKZvXlkGsm7ZzLd87RtsJPycFsaexg0/embed?start=false&loop=false&delayms=3000",
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
