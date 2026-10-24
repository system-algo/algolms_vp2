import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M7L2() {
  const activity = {
    id: "VP_M7L2",
    title: "M7L2",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M7-Hackathon-Series/pages/VP_M7L2/workspace",
    moduleId: "M7-Hackathon-Series",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
