import React from 'react';
import GoogleSlidesPage from '../../../../pages/GoogleSlidesPage';

export default function VP2_M4L3_SLIDES() {
  const activity = {
    id: "VP2_M4L3_SLIDES",
    title: "Slide: M4L3 - Random numbers and ranges",
    embedUrl: "https://docs.google.com/presentation/d/1pfmw88hHc6eETk59oB9wKSbLiKY3yYlFPDlsoidwn_Y/embed?start=false&loop=false&delayms=3000",
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
