'use client'

import { useState } from 'react'
import { Download, Instagram, Facebook } from 'lucide-react'

type TemplateStyle = 'minimalist' | 'dark-elegant' | 'bold-statement' | 'lifestyle-grid' | 'coming-soon'
type PostType = 'instagram' | 'story'

interface PostContent {
  mainText: string
  subText: string
  productImage?: string
  backgroundColor: string
  textColor: string
  accentColor: string
}

export default function SocialMediaPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('minimalist')
  const [postType, setPostType] = useState<PostType>('instagram')
  const [content, setContent] = useState<PostContent>({
    mainText: 'COMING SOON',
    subText: 'MOSEWEAR.COM',
    productImage: '',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    accentColor: '#D4AF37',
  })

  const templates: Record<TemplateStyle, { name: string; description: string; defaultColors: Pick<PostContent, 'backgroundColor' | 'textColor' | 'accentColor'> }> = {
    minimalist: {
      name: 'Minimalist product',
      description: 'Clean wit met product + MOSE logo',
      defaultColors: {
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        accentColor: '#000000',
      },
    },
    'dark-elegant': {
      name: 'Dark elegant',
      description: 'Zwarte achtergrond, gouden accenten',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#D4AF37',
      },
    },
    'bold-statement': {
      name: 'Bold statement',
      description: 'Grote tekst, moderne typography',
      defaultColors: {
        backgroundColor: '#1A1A1A',
        textColor: '#FFFFFF',
        accentColor: '#FF6B35',
      },
    },
    'lifestyle-grid': {
      name: 'Lifestyle grid',
      description: 'Product + lifestyle foto combinatie',
      defaultColors: {
        backgroundColor: '#F5F5F5',
        textColor: '#1A1A1A',
        accentColor: '#2C5F2D',
      },
    },
    'coming-soon': {
      name: 'Coming soon',
      description: 'Teaser template voor nieuwe producten',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#D4AF37',
      },
    },
  }

  const handleTemplateChange = (template: TemplateStyle) => {
    setSelectedTemplate(template)
    setContent({
      ...content,
      ...templates[template].defaultColors,
    })
  }

  const handleDownload = () => {
    const canvas = document.getElementById('social-preview') as HTMLDivElement
    if (!canvas) return

    // Use html2canvas or similar library in production
    // For now, we'll use a simple approach
    alert('Screenshot functie - implementeer html2canvas voor productie gebruik')
  }

  // Dimensions based on post type
  const dimensions = postType === 'instagram' 
    ? { width: 1080, height: 1080 } 
    : { width: 1080, height: 1920 }

  // Safe zone for Instagram grid (portrait mode)
  const safeZone = postType === 'instagram'
    ? { top: 135, bottom: 135 } // Instagram toont portrait (4:5 crop in grid)
    : { top: 0, bottom: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Social media content generator</h1>
        <p className="mt-2 text-gray-600">
          Genereer perfecte Instagram en Facebook posts in MOSE style
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Post Type */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Post type</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPostType('instagram')}
                className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all ${
                  postType === 'instagram'
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                }`}
              >
                <Instagram className="w-5 h-5" />
                <span className="font-bold">Instagram post (1:1)</span>
              </button>
              <button
                onClick={() => setPostType('story')}
                className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all ${
                  postType === 'story'
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                }`}
              >
                <Facebook className="w-5 h-5" />
                <span className="font-bold">Story (9:16)</span>
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Template style</h3>
            <div className="space-y-2">
              {(Object.keys(templates) as TemplateStyle[]).map((template) => (
                <button
                  key={template}
                  onClick={() => handleTemplateChange(template)}
                  className={`w-full text-left px-4 py-3 border-2 transition-all ${
                    selectedTemplate === template
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                  }`}
                >
                  <div className="font-bold">{templates[template].name}</div>
                  <div className={`text-sm mt-1 ${selectedTemplate === template ? 'text-white/80' : 'text-gray-500'}`}>
                    {templates[template].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Inputs */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Hoofdtekst
                </label>
                <input
                  type="text"
                  value={content.mainText}
                  onChange={(e) => setContent({ ...content, mainText: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="COMING SOON"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Subtekst
                </label>
                <input
                  type="text"
                  value={content.subText}
                  onChange={(e) => setContent({ ...content, subText: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="MOSEWEAR.COM"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Product afbeelding URL
                </label>
                <input
                  type="text"
                  value={content.productImage}
                  onChange={(e) => setContent({ ...content, productImage: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Achtergrondkleur
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.backgroundColor}
                    onChange={(e) => setContent({ ...content, backgroundColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.backgroundColor}
                    onChange={(e) => setContent({ ...content, backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tekstkleur
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.textColor}
                    onChange={(e) => setContent({ ...content, textColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.textColor}
                    onChange={(e) => setContent({ ...content, textColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Accentkleur
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.accentColor}
                    onChange={(e) => setContent({ ...content, accentColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.accentColor}
                    onChange={(e) => setContent({ ...content, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary text-white font-bold border-2 border-brand-primary hover:bg-black hover:border-black transition-all"
          >
            <Download className="w-5 h-5" />
            Download als afbeelding
          </button>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Preview</h3>
              <div className="text-sm text-gray-500">
                {dimensions.width} × {dimensions.height}px
                {postType === 'instagram' && (
                  <span className="ml-2 text-orange-600 font-bold">
                    (Portrait safe zone: {safeZone.top}px top/bottom)
                  </span>
                )}
              </div>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center bg-gray-100 p-8">
              <div
                id="social-preview"
                style={{
                  width: postType === 'instagram' ? '540px' : '324px',
                  height: postType === 'instagram' ? '540px' : '576px',
                  backgroundColor: content.backgroundColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                className="shadow-2xl"
              >
                {/* Safe Zone Indicators (Instagram only) */}
                {postType === 'instagram' && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: `${(safeZone.top / dimensions.height) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderBottom: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(safeZone.bottom / dimensions.height) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderTop: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                  </>
                )}

                {/* Template Rendering */}
                {selectedTemplate === 'minimalist' && (
                  <MinimalistTemplate content={content} postType={postType} />
                )}
                {selectedTemplate === 'dark-elegant' && (
                  <DarkElegantTemplate content={content} postType={postType} />
                )}
                {selectedTemplate === 'bold-statement' && (
                  <BoldStatementTemplate content={content} postType={postType} />
                )}
                {selectedTemplate === 'lifestyle-grid' && (
                  <LifestyleGridTemplate content={content} postType={postType} />
                )}
                {selectedTemplate === 'coming-soon' && (
                  <ComingSoonTemplate content={content} postType={postType} />
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 text-sm">
              <p className="font-bold text-blue-900 mb-2">💡 Tip voor Instagram:</p>
              <p className="text-blue-800">
                De rode zones bovenaan en onderaan worden afgesneden in de Instagram grid (portrait weergave).
                Plaats belangrijke content zoals logo en tekst in de groene zone!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Template Components
function MinimalistTemplate({ content, postType }: { content: PostContent; postType: PostType }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
      {/* Logo Top */}
      <div style={{ position: 'absolute', top: postType === 'instagram' ? '200px' : '80px', left: '50%', transform: 'translateX(-50%)' }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ height: '40px', width: 'auto', filter: content.backgroundColor === '#FFFFFF' ? 'none' : 'brightness(0) invert(1)', opacity: 0.9 }}
        />
      </div>

      {/* Product Image */}
      {content.productImage && (
        <img
          src={content.productImage}
          alt="Product"
          style={{ maxWidth: '60%', maxHeight: '50%', objectFit: 'contain', marginBottom: '40px' }}
        />
      )}

      {/* Main Text */}
      <h1 style={{ fontSize: postType === 'story' ? '48px' : '64px', fontWeight: 900, color: content.textColor, textAlign: 'center', marginBottom: '20px', fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }}>
        {content.mainText}
      </h1>

      {/* Sub Text */}
      <p style={{ fontSize: postType === 'story' ? '18px' : '24px', color: content.accentColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', letterSpacing: '4px', fontWeight: 600 }}>
        {content.subText}
      </p>
    </div>
  )
}

function DarkElegantTemplate({ content, postType }: { content: PostContent; postType: PostType }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', background: `linear-gradient(135deg, ${content.backgroundColor} 0%, #1a1a1a 100%)` }}>
      {/* Decorative Border */}
      <div style={{ position: 'absolute', top: '40px', left: '40px', right: '40px', bottom: '40px', border: `3px solid ${content.accentColor}`, opacity: 0.3 }} />

      {/* Logo */}
      <div style={{ position: 'absolute', top: postType === 'instagram' ? '180px' : '100px', left: '50%', transform: 'translateX(-50%)' }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ height: '50px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }}
        />
      </div>

      {/* Product Image with Gold Frame */}
      {content.productImage && (
        <div style={{ border: `4px solid ${content.accentColor}`, padding: '20px', backgroundColor: 'rgba(0,0,0,0.5)', marginBottom: '40px' }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ width: '300px', height: '300px', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Main Text */}
      <h1 style={{ fontSize: postType === 'story' ? '42px' : '56px', fontWeight: 900, color: content.accentColor, textAlign: 'center', marginBottom: '16px', fontFamily: 'Georgia, serif', letterSpacing: '3px', textTransform: 'uppercase' }}>
        {content.mainText}
      </h1>

      {/* Divider */}
      <div style={{ width: '100px', height: '2px', backgroundColor: content.accentColor, marginBottom: '16px' }} />

      {/* Sub Text */}
      <p style={{ fontSize: postType === 'story' ? '16px' : '20px', color: content.textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', letterSpacing: '6px', fontWeight: 300, opacity: 0.9 }}>
        {content.subText}
      </p>
    </div>
  )
}

function BoldStatementTemplate({ content, postType }: { content: PostContent; postType: PostType }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      {/* Logo Small Corner */}
      <div style={{ position: 'absolute', top: postType === 'instagram' ? '160px' : '40px', right: '40px' }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ height: '30px', width: 'auto', filter: content.backgroundColor === '#FFFFFF' ? 'none' : 'brightness(0) invert(1)', opacity: 0.7 }}
        />
      </div>

      {/* Main Text - HUGE */}
      <h1 style={{ fontSize: postType === 'story' ? '64px' : '96px', fontWeight: 900, color: content.textColor, textAlign: 'center', lineHeight: '1', fontFamily: 'Arial Black, sans-serif', letterSpacing: '-2px', marginBottom: '30px', textTransform: 'uppercase' }}>
        {content.mainText.split(' ').map((word, i) => (
          <span key={i} style={{ display: 'block', color: i % 2 === 0 ? content.textColor : content.accentColor }}>
            {word}
          </span>
        ))}
      </h1>

      {/* Product Image (if provided) */}
      {content.productImage && (
        <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', border: `6px solid ${content.accentColor}` }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Sub Text */}
      <p style={{ fontSize: postType === 'story' ? '18px' : '24px', color: content.textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', letterSpacing: '8px', fontWeight: 700, opacity: 0.8, position: 'absolute', bottom: '40px' }}>
        {content.subText}
      </p>
    </div>
  )
}

function LifestyleGridTemplate({ content, postType }: { content: PostContent; postType: PostType }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'grid', gridTemplateColumns: postType === 'story' ? '1fr' : '1fr 1fr', gap: '0' }}>
      {/* Left/Top Side - Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', backgroundColor: content.backgroundColor }}>
        {/* Logo */}
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ height: '40px', width: 'auto', filter: content.backgroundColor === '#FFFFFF' || content.backgroundColor === '#F5F5F5' ? 'none' : 'brightness(0) invert(1)', marginBottom: '30px', opacity: 0.9 }}
        />

        {/* Main Text */}
        <h1 style={{ fontSize: postType === 'story' ? '36px' : '42px', fontWeight: 900, color: content.textColor, textAlign: 'center', marginBottom: '16px', fontFamily: 'Arial, sans-serif', letterSpacing: '1px', lineHeight: '1.2' }}>
          {content.mainText}
        </h1>

        {/* Sub Text */}
        <p style={{ fontSize: postType === 'story' ? '14px' : '16px', color: content.accentColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', letterSpacing: '3px', fontWeight: 600 }}>
          {content.subText}
        </p>
      </div>

      {/* Right/Bottom Side - Product Image */}
      {content.productImage ? (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div style={{ backgroundColor: content.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: content.backgroundColor, fontSize: '14px', fontFamily: 'Arial, sans-serif', opacity: 0.5 }}>
            Voeg product afbeelding toe
          </p>
        </div>
      )}
    </div>
  )
}

function ComingSoonTemplate({ content, postType }: { content: PostContent; postType: PostType }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Product Image Background */}
      {content.productImage && (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3, filter: 'blur(8px)' }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Dark Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${content.backgroundColor} 0%, rgba(0,0,0,0.8) 100%)` }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 10, marginBottom: '60px' }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ height: postType === 'story' ? '50px' : '60px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }}
        />
      </div>

      {/* Main Text */}
      <h1 style={{ position: 'relative', zIndex: 10, fontSize: postType === 'story' ? '52px' : '72px', fontWeight: 900, color: content.textColor, textAlign: 'center', marginBottom: '30px', fontFamily: 'Arial, sans-serif', letterSpacing: '4px', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        {content.mainText}
      </h1>

      {/* Sub Text with Border */}
      <div style={{ position: 'relative', zIndex: 10, border: `3px solid ${content.accentColor}`, padding: '16px 40px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <p style={{ fontSize: postType === 'story' ? '18px' : '24px', color: content.accentColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', letterSpacing: '6px', fontWeight: 700 }}>
          {content.subText}
        </p>
      </div>

      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: postType === 'instagram' ? '160px' : '60px', left: '60px', width: '40px', height: '40px', border: `2px solid ${content.accentColor}`, opacity: 0.4 }} />
      <div style={{ position: 'absolute', bottom: '60px', right: '60px', width: '40px', height: '40px', border: `2px solid ${content.accentColor}`, opacity: 0.4 }} />
    </div>
  )
}

