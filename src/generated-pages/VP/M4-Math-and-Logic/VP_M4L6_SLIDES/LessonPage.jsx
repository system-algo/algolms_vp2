import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP_M4L6_SLIDES() {
  const activity = {
    id: "VP_M4L6_SLIDES",
    title: "Slide: M4L6 - Group project. Finalization",
    embedUrl: "https://docs.google.com/presentation/d/12xgucqMR66yUPEs68jdxGvrxMsaCLQ1ueVDCfBHZkeQ/embed?start=false&loop=false&delayms=3000",
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
