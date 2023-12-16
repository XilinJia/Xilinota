Pod::Spec.new do |spec|
  spec.name         = "XilinotaCommonShareExtension"
  spec.version      = "1.0.0"
  spec.summary      = "Common Share Extension code for Xilinota."
  spec.description  = "Common Share Extension for Xilinota"
  spec.homepage     = "https://github.com/XilinJia/Xilinota"
  spec.license      = { :type => "AGPL-3.0-or-later" }
  spec.author       = { "Duncan Cunningham" => "duncanc4@gmail.com" }
  spec.platform     = :ios, "9.0"
  spec.source       = { :path => "." }
  spec.source_files = "Source/Common/**/*.{h,m}"
end
