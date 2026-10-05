Pod::Spec.new do |s|
  s.name = 'StackWorkoutControls'
  s.version = '1.0.0'
  s.summary = 'Native workout toolbar controls'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Stack'
  s.homepage = 'https://liftwithstack.com'
  s.platform = :ios, '16.4'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
