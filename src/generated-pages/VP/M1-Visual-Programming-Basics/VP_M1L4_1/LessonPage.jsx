import React from 'react';
import H5pPlayerPage from '../../../../pages/H5pPlayerPage';

export default function VP_M1L4_1() {
  const activity = {
    id: "VP_M1L4_1",
    title: "Fill in the blanks",
    taskCount: 1,
    h5pPlayUrl: "/courses/VP/M1-Visual-Programming-Basics/pages/VP_M1L4_1/workspace",
    moduleId: "M1-Visual-Programming-Basics",
  };

  return (
    <H5pPlayerPage
      activity={activity}
      courseId="VP"
      onBack={() => window.history.back()}
    />
  );
}
