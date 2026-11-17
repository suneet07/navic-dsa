import React from 'react';
import { Icon } from './Icon';

export default function Header({ onAbout }) {
  return <>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Navic home">
        <span className="brand-mark"><Icon name="compass" size={26}/></span>
        <span>navic<span className="brand-period">.</span></span>
      </a>
      <div className="header-divider"/>
      <span className="brand-tagline">A little clarity.<br/>A better way there.</span>
      <nav aria-label="Main navigation">
        <span className="nav-active">Route planner</span>
        <button onClick={onAbout}>Behind the route <Icon name="arrow" size={15}/></button>
      </nav>
      <span className="project-label">BUILT ON OPEN MAPS <span>↗</span></span>
    </header>
    <nav className="panel-shortcuts" aria-label="Jump to a panel">
      <a href="#planner"><Icon name="route" size={17}/> Plan route</a>
      <a href="#route-map"><Icon name="pin" size={17}/> View map</a>
    </nav>
  </>;
}
