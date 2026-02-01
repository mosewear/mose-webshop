'use client'

import { useState } from 'react'
import { Download, Instagram, Facebook } from 'lucide-react'

type TemplateStyle = 'style-1' | 'style-2' | 'style-3' | 'style-4' | 'style-5'
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('style-1')
  const [postType, setPostType] = useState<PostType>('instagram')
  const [content, setContent] = useState<PostContent>({
    mainText: 'COMING SOON',
    subText: 'MOSEWEAR.COM',
    productImage: '',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    accentColor: '#00A676',
  })

  const templates: Record<TemplateStyle, { name: string; description: string; defaultColors: Pick<PostContent, 'backgroundColor' | 'textColor' | 'accentColor'> }> = {
    'style-1': {
      name: 'Style 1 - Classic',
      description: 'Zwarte achtergrond met MOSE groene accenten',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-2': {
      name: 'Style 2 - Clean',
      description: 'Witte achtergrond met groene accenten',
      defaultColors: {
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        accentColor: '#00A676',
      },
    },
    'style-3': {
      name: 'Style 3 - Bold',
      description: 'Groen als hoofdkleur',
      defaultColors: {
        backgroundColor: '#00A676',
        textColor: '#FFFFFF',
        accentColor: '#000000',
      },
    },
    'style-4': {
      name: 'Style 4 - Minimal',
      description: 'Grijs met subtiele accenten',
      defaultColors: {
        backgroundColor: '#F5F5F5',
        textColor: '#1A1A1A',
        accentColor: '#00A676',
      },
    },
    'style-5': {
      name: 'Style 5 - Dark green',
      description: 'Donkergroen met witte tekst',
      defaultColors: {
        backgroundColor: '#004D3D',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
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
    alert('💡 TIP: Gebruik Cmd+Shift+4 (Mac) of Snipping Tool (Windows) om een screenshot te maken van de preview voor perfecte kwaliteit!')
  }

  // Instagram: 1080x1080, maar grid toont als 4:5 portrait (1080x1350)
  // Dus de linker en rechter 135px worden NIET getoond in grid
  const dimensions = postType === 'instagram' 
    ? { width: 1080, height: 1080 } 
    : { width: 1080, height: 1920 }

  // Safe zone voor Instagram: links en rechts 135px worden afgesneden in portrait grid view
  const safeZone = postType === 'instagram'
    ? { left: 135, right: 135 } // Instagram toont 4:5 portrait crop in grid
    : { left: 0, right: 0 }

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
            <h3 className="text-lg font-bold text-gray-900 mb-4">MOSE template style</h3>
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
                  Accentkleur (MOSE groen aanbevolen)
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
            Screenshot instructies
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
                    (Safe zone: {safeZone.left}px links/rechts)
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
                {/* Safe Zone Indicators (Instagram only) - LINKS EN RECHTS! */}
                {postType === 'instagram' && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${(safeZone.left / dimensions.width) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.15)',
                        borderRight: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: `${(safeZone.right / dimensions.width) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.15)',
                        borderLeft: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                  </>
                )}

                {/* Template Rendering - All use unified MOSE styling */}
                <UnifiedMoseTemplate 
                  content={content} 
                  postType={postType} 
                  variant={selectedTemplate}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 text-sm">
              <p className="font-bold text-blue-900 mb-2">💡 Tip voor Instagram grid:</p>
              <p className="text-blue-800 mb-2">
                De rode zones links en rechts worden afgesneden in de Instagram grid weergave (portrait 4:5).
                Plaats belangrijke content zoals logo en tekst in het midden (groene zone)!
              </p>
              <p className="text-blue-900 font-bold mt-3 mb-1">📸 Screenshot maken:</p>
              <ul className="text-blue-800 list-disc list-inside space-y-1">
                <li><strong>Mac:</strong> Cmd + Shift + 4, selecteer het preview vierkant</li>
                <li><strong>Windows:</strong> Gebruik Snipping Tool of Win + Shift + S</li>
                <li>Voor beste kwaliteit: screenshot alleen het preview vierkant (niet de hele pagina)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Unified MOSE Template - Alle 5 varianten gebruiken dezelfde design language
function UnifiedMoseTemplate({ 
  content, 
  postType, 
  variant 
}: { 
  content: PostContent
  postType: PostType
  variant: TemplateStyle 
}) {
  const isStory = postType === 'story'
  const isDarkBg = ['#000000', '#000', '#004D3D'].includes(content.backgroundColor) || 
                   parseInt(content.backgroundColor.replace('#', ''), 16) < 0x808080

  // Consistent layout structure voor alle varianten
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isStory ? '80px 40px' : '60px 40px',
      fontFamily: 'Montserrat, Arial, sans-serif',
    }}>
      {/* Logo - Altijd bovenaan, gecentreerd */}
      <div style={{ 
        position: 'absolute', 
        top: isStory ? '80px' : '60px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ 
            height: isStory ? '45px' : '40px',
            width: 'auto', 
            filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
            opacity: 0.95,
          }}
        />
      </div>

      {/* Product Image - Als aanwezig */}
      {content.productImage && (
        <div style={{ 
          marginBottom: isStory ? '50px' : '40px',
          maxWidth: isStory ? '60%' : '55%',
          maxHeight: isStory ? '40%' : '35%',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: variant === 'style-3' ? 'brightness(1.1)' : 'none',
            }}
          />
        </div>
      )}

      {/* Main Text - Anton font (MOSE display font) */}
      <h1 style={{ 
        fontSize: isStory ? '56px' : '64px',
        fontWeight: 400,
        color: content.textColor,
        textAlign: 'center',
        marginBottom: isStory ? '24px' : '20px',
        fontFamily: 'Anton, Arial Black, sans-serif',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        lineHeight: '1.1',
        zIndex: 5,
      }}>
        {content.mainText}
      </h1>

      {/* Accent Line - MOSE signature element */}
      <div style={{ 
        width: '80px',
        height: '3px',
        backgroundColor: content.accentColor,
        marginBottom: isStory ? '24px' : '20px',
        zIndex: 5,
      }} />

      {/* Sub Text - Montserrat (MOSE body font) */}
      <p style={{ 
        fontSize: isStory ? '18px' : '20px',
        color: content.textColor,
        textAlign: 'center',
        fontFamily: 'Montserrat, Arial, sans-serif',
        letterSpacing: '5px',
        fontWeight: 600,
        opacity: 0.9,
        textTransform: 'uppercase',
        zIndex: 5,
      }}>
        {content.subText}
      </p>

      {/* Variant-specific decorative elements */}
      {variant === 'style-1' && (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', width: '30px', height: '30px', border: `2px solid ${content.accentColor}`, opacity: 0.3 }} />
          <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '30px', height: '30px', border: `2px solid ${content.accentColor}`, opacity: 0.3 }} />
        </>
      )}

      {variant === 'style-2' && (
        <div style={{ position: 'absolute', inset: '30px', border: `1px solid ${content.textColor}`, opacity: 0.1, pointerEvents: 'none' }} />
      )}

      {variant === 'style-3' && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: `linear-gradient(135deg, ${content.backgroundColor} 0%, rgba(0,0,0,0.3) 100%)`,
          zIndex: 1,
        }} />
      )}

      {variant === 'style-4' && (
        <>
          <div style={{ position: 'absolute', top: '30px', left: '30px', right: '30px', height: '1px', backgroundColor: content.accentColor, opacity: 0.2 }} />
          <div style={{ position: 'absolute', bottom: '30px', left: '30px', right: '30px', height: '1px', backgroundColor: content.accentColor, opacity: 0.2 }} />
        </>
      )}

      {variant === 'style-5' && (
        <div style={{ 
          position: 'absolute', 
          inset: '25px', 
          border: `2px solid ${content.accentColor}`, 
          opacity: 0.2,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
